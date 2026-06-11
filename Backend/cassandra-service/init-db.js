/**
 * Script de inicialización de la base de datos Cassandra.
 * Lee el archivo scripts/schema.cql, lo divide en statements y los
 * ejecuta secuencialmente contra el cluster para crear el keyspace
 * y las tablas necesarias.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const cassandra = require('cassandra-driver');

function crearCliente() {
    return new cassandra.Client({
        contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
        localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
        socketOptions: { connectTimeout: 10000 },
    });
}

async function init() {
    const client = crearCliente();
    try {
        await client.connect();
        console.log('Conectado a Cassandra');

        const schemaPath = path.join(__dirname, 'scripts', 'schema.cql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
            await client.execute(stmt + ';');
        }

        console.log('Keyspace museo_auditoria listo.');
    } finally {
        await client.shutdown().catch(() => {});
    }
}

async function initConReintentos(maxIntentos = 15, esperaMs = 8000) {
    for (let i = 1; i <= maxIntentos; i++) {
        try {
            await init();
            return;
        } catch (err) {
            if (i < maxIntentos) {
                console.log(`Cassandra no lista (intento ${i}/${maxIntentos}): ${err.message}. Reintentando en ${esperaMs / 1000}s...`);
                await new Promise(r => setTimeout(r, esperaMs));
            } else {
                console.error('Error inicializando schema Cassandra:', err.message);
                process.exit(1);
            }
        }
    }
}

initConReintentos();
