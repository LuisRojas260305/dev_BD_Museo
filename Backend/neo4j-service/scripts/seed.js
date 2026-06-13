/**
 * Seed / migración del grafo de conocimiento (Sprint 3 - Neo4j).
 *
 * Construye el grafo políglota a partir de las otras dos fuentes del museo:
 *   - Catálogo (MongoDB vía mongodb-service): Obras, Artistas, Géneros.
 *   - Core transaccional (MySQL): Compradores y ventas concretadas → COMPRÓ.
 *
 * Topología resultante:
 *   (Comprador)-[:COMPRÓ]->(Obra)<-[:CREÓ]-(Artista)-[:TRABAJA_EN]->(Genero)
 *   (Obra)-[:PERTENECE_A]->(Genero)
 *
 * Idempotente: usa MERGE en todas las escrituras, se puede reejecutar.
 *
 * Uso:  node scripts/seed.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');
const { run, verifyConnectivity, close } = require('../config/neo4j');
const grafo = require('../models/grafo');

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001/api/catalog';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

const catalogo = axios.create({
    baseURL: CATALOG_URL,
    timeout: 15000,
    headers: { 'x-internal-key': INTERNAL_KEY },
});

/** Aplica los constraints/índices de schema.cypher (idempotente). */
async function aplicarSchema() {
    const ruta = path.join(__dirname, 'schema.cypher');
    const contenido = fs.readFileSync(ruta, 'utf8');
    const sentencias = contenido
        .split(';')
        .map(s => s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').trim())
        .filter(s => s.length > 0);
    for (const stmt of sentencias) {
        await run(stmt, {}, { mode: 'WRITE' });
    }
    console.log(`  Schema aplicado (${sentencias.length} sentencias).`);
}

/** Descarga TODAS las obras del catálogo paginando el endpoint Mongo. */
async function obtenerObras() {
    const todas = [];
    let page = 1;
    let totalPages = 1;
    do {
        const { data } = await catalogo.get('/', { params: { page, limit: 200 } });
        todas.push(...(data.data || []));
        totalPages = data.totalPages || 1;
        page++;
    } while (page <= totalPages);
    return todas;
}

/** Construye nodos Obra + Artista + Genero a partir del catálogo Mongo. */
async function migrarCatalogo() {
    const obras = await obtenerObras();
    console.log(`  ${obras.length} obras obtenidas del catálogo.`);

    // Mapa idAlternativo -> obra_id canónico (_id de Mongo), para resolver las ventas
    const indiceObra = new Map();

    for (const obra of obras) {
        const obraIdCanonico = String(obra._id);
        const genero = obra.genero || obra.genero_nombre || '';
        const precio = Number(obra.precio_venta) || 0;

        await grafo.upsertObra({
            obra_id: obraIdCanonico,
            nombre: obra.nombre,
            genero,
            precio,
            estado: obra.estado || 'Disponible',
        });

        // Artista (embebido vía $lookup) -> CREÓ + TRABAJA_EN
        const artistaId = obra.artista_id ? String(obra.artista_id)
            : (obra.artista_nombre || 'desconocido');
        const artistaNombre = obra.artista_nombre
            || (obra.artista ? `${obra.artista.nombre || ''} ${obra.artista.apellido || ''}`.trim() : '')
            || 'Desconocido';
        const nacionalidad = obra.artista?.nacionalidad || '';

        await grafo.upsertArtista({
            artista_id: artistaId,
            nombre: artistaNombre,
            nacionalidad,
            obra_id: obraIdCanonico,
            genero,
        });

        // Indexar por ambas claves posibles que pudo guardar Venta.obra_id
        indiceObra.set(obraIdCanonico, { obra_id: obraIdCanonico, nombre: obra.nombre, genero });
        if (obra.obra_id_original != null) {
            indiceObra.set(String(obra.obra_id_original), { obra_id: obraIdCanonico, nombre: obra.nombre, genero });
        }
    }
    console.log('  Nodos Obra/Artista/Genero creados.');
    return indiceObra;
}

/** Crea Compradores y aristas COMPRÓ a partir de las ventas concretadas (MySQL). */
async function migrarCompras(indiceObra) {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'Museo',
    });

    const [ventas] = await conn.query(
        `SELECT v.venta_id, v.obra_id, v.comprador_id, v.obra_nombre,
                v.precio_venta, v.fecha_venta,
                u.nombre, u.apellido, u.email
         FROM Venta v
         JOIN Usuario u ON v.comprador_id = u.usuario_id
         WHERE v.estado = 'vendida'`
    );
    console.log(`  ${ventas.length} ventas concretadas en MySQL.`);

    let enlazadas = 0;
    for (const v of ventas) {
        const ref = indiceObra.get(String(v.obra_id));
        const obraId = ref ? ref.obra_id : String(v.obra_id);
        const genero = ref ? ref.genero : '';
        const nombre = ref ? ref.nombre : (v.obra_nombre || 'Sin título');

        await grafo.registrarCompra({
            usuario_id: v.comprador_id,
            comprador_nombre: `${v.nombre || ''} ${v.apellido || ''}`.trim(),
            comprador_email: v.email || '',
            obra_id: obraId,
            obra_nombre: nombre,
            genero,
            precio: Number(v.precio_venta) || 0,
            venta_id: v.venta_id,
            fecha: v.fecha_venta ? new Date(v.fecha_venta).toISOString() : new Date().toISOString(),
        });
        enlazadas++;
    }
    await conn.end();
    console.log(`  ${enlazadas} aristas COMPRÓ creadas.`);
}

async function main() {
    console.log('=== Seed del grafo de conocimiento (Neo4j) ===');
    await verifyConnectivity();
    console.log('  Conectado a Neo4j.');

    await aplicarSchema();
    const indiceObra = await migrarCatalogo();
    await migrarCompras(indiceObra);

    const stats = await grafo.estadisticas();
    console.log('=== Grafo construido ===');
    console.log(stats);
    await close();
}

main().catch(async (err) => {
    console.error('Error en el seed:', err.message);
    await close().catch(() => {});
    process.exit(1);
});
