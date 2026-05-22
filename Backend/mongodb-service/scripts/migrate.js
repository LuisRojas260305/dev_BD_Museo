require('dotenv').config();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const Artista = require('../models/Artista');
const Obra = require('../models/Obra');

const BATCH_SIZE = 100;
const FORCE = process.argv.includes('--force');

const generoDiscriminatorMap = {
  1: 'Pintura',
  2: 'Escultura',
  3: 'Orfebrería',
  4: 'Cerámica',
  5: 'Fotografía',
};

const connectMySQL = () => mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
});

async function migrate() {
  console.log('=== INICIANDO MIGRACIÓN MySQL → MongoDB ===\n');
  const mysqlPool = connectMySQL();

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado\n');

  if (FORCE) {
    console.log('Force mode: limpiando colecciones...');
    await Promise.all([
      Artista.deleteMany({}),
      Obra.deleteMany({}),
    ]);
    console.log('Colecciones limpiadas\n');
  }

  // FASE 1: Migrar Artistas
  console.log('=== FASE 1: Migrando Artistas ===');
  const [artistas] = await mysqlPool.query(`
    SELECT a.*, n.nacionalidad
    FROM Artista a
    LEFT JOIN Nacionalidad n ON a.nacionalidad_id = n.nacionalidad_id
  `);

  const artistaMap = new Map();
  for (let i = 0; i < artistas.length; i += BATCH_SIZE) {
    const batch = artistas.slice(i, i + BATCH_SIZE);
    const docs = batch.map(a => ({
      artista_id_original: a.artista_id,
      nombre: a.nombre,
      apellido: a.apellido,
      biografia: a.biografia,
      fecha_nacimiento: a.fecha_nacimiento || undefined,
      nacionalidad: a.nacionalidad,
      fotos: a.foto ? [`/uploads/artista_${a.artista_id}.jpg`] : [],
      porcentaje_ganancia: a.porcentaje_ganancia || 5.0,
      comentario: a.comentario,
    }));

    const inserted = await Artista.insertMany(docs, { ordered: false });
    inserted.forEach((doc, idx) => {
      artistaMap.set(batch[idx].artista_id, doc._id);
    });
    console.log(`  Artistas: ${i + batch.length}/${artistas.length}`);
  }

  // FASE 2: Migrar Obras por género
  console.log('\n=== FASE 2: Migrando Obras ===');

  for (const [generoId, generoNombre] of Object.entries(generoDiscriminatorMap)) {
    const obraRows = await mysqlPool.query(`
      SELECT o.*, g.nombre AS genero_nombre, e.nombre AS epoca_nombre,
             e.ano_inicio, e.ano_final
      FROM Obra o
      JOIN Genero g ON o.genero_id = g.genero_id
      LEFT JOIN Epoca e ON o.epoca_id = e.epoca_id
      WHERE o.genero_id = ${generoId}
    `);

    const rows = obraRows[0];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const docs = await Promise.all(batch.map(async (o) => {
        let detalles = {};
        if (generoId === 1) { // Pintura
          const [extras] = await mysqlPool.query(
            'SELECT * FROM Pintura WHERE obra_id = ?', [o.obra_id]
          );
          if (extras[0]) {
            const p = extras[0];
            const [estilos] = await mysqlPool.query(
              `SELECT es.nombre FROM Pintura_Estilo pe
               JOIN Estilo es ON pe.estilo_id = es.estilo_id
               WHERE pe.obra_id = ?`, [o.obra_id]
            );
            detalles = {
              soporte: p.soporte_nombre || p.soporte,
              estilos: estilos.map(e => e.nombre),
              tematicas: p.tematicas ? p.tematicas.split(',').map(t => t.trim()) : [],
            };
          }
        } else if (generoId === 2) { // Escultura
          const [extras] = await mysqlPool.query(
            'SELECT * FROM Escultura WHERE obra_id = ?', [o.obra_id]
          );
          if (extras[0]) {
            const e = extras[0];
            const [materiales] = await mysqlPool.query(
              `SELECT ma.nombre FROM Escultura_Material em
               JOIN Material ma ON em.material_id = ma.material_id
               WHERE em.obra_id = ?`, [o.obra_id]
            );
            detalles = {
              peso: e.peso,
              profundidad: e.profundidad,
              tipo_escultura: e.tipo_escultura,
              materiales: materiales.map(m => m.nombre),
              tecnicas: e.tecnicas ? e.tecnicas.split(',').map(t => t.trim()) : [],
            };
          }
        } else if (generoId === 3) { // Orfebrería
          const [extras] = await mysqlPool.query(
            'SELECT * FROM Orfebreria WHERE obra_id = ?', [o.obra_id]
          );
          if (extras[0]) {
            const or = extras[0];
            detalles = {
              profundidad: or.profundidad,
              diametro: or.diametro,
              peso: or.peso,
              pieza: or.pieza,
              metal_predominante: or.metal_predominante,
              metales: or.metales ? or.metales.split(',').map(m => m.trim()) : [],
            };
          }
        } else if (generoId === 4) { // Cerámica
          const [extras] = await mysqlPool.query(
            'SELECT * FROM Ceramica WHERE obra_id = ?', [o.obra_id]
          );
          if (extras[0]) {
            const c = extras[0];
            detalles = {
              profundidad: c.profundidad,
              diametro: c.diametro,
              funcionalidad: c.funcionalidad,
              coccion: c.coccion,
              arcilla: c.arcilla,
              modelado: c.modelado,
              esmaltado: c.esmaltado,
            };
          }
        } else if (generoId === 5) { // Fotografía
          const [extras] = await mysqlPool.query(
            'SELECT * FROM Fotografia WHERE obra_id = ?', [o.obra_id]
          );
          if (extras[0]) {
            const f = extras[0];
            detalles = {
              tiraje: f.tiraje,
              obturacion: f.obturacion,
              apertura: f.apertura,
              iso: f.iso,
              resolucion: f.resolucion,
              fecha_captura: f.fecha_captura || undefined,
              impresion: f.impresion,
              camara: f.camara,
              tecnica_fotografica: f.tecnica_fotografica,
            };
          }
        }

        return {
          obra_id_original: o.obra_id,
          codigo_inventario: o.codigo_inventario,
          nombre: o.nombre,
          artista_id: artistaMap.get(o.artista_id),
          artista: {
            nombre: o.artista_nombre,
            apellido: o.artista_apellido,
            nacionalidad: o.nacionalidad,
          },
          genero: generoNombre,
          epoca: {
            nombre: o.epoca_nombre,
            ano_inicio: o.ano_inicio,
            ano_final: o.ano_final,
          },
          precio_venta: o.precio_venta,
          alto: o.alto,
          ancho: o.ancho,
          fecha_creacion: o.fecha_creacion || undefined,
          estado: o.estado || 'Disponible',
          fotos: o.foto ? [`/uploads/obra_${o.obra_id}.jpg`] : [],
          descripcion: o.descripcion,
          comentario: o.comentario,
          detalles,
        };
      }));

      try {
        await Obra.insertMany(docs, { ordered: false });
      } catch (err) {
        console.error(`  Error en batch ${i}-${i + batch.length}: ${err.message}`);
      }
      console.log(`  ${generoNombre}: ${i + batch.length}/${rows.length}`);
    }
  }

  // FASE 3: Crear índices
  console.log('\n=== FASE 3: Creando índices ===');
  await Promise.all([
    Artista.collection.createIndex({ nombre: 1, apellido: 1 }),
    Artista.collection.createIndex({ nacionalidad: 1 }),
    Obra.collection.createIndex({ genero: 1, precio_venta: 1 }),
    Obra.collection.createIndex({ estado: 1, precio_venta: 1 }),
    Obra.collection.createIndex({ codigo_inventario: 1 }, { unique: true }),
    Obra.collection.createIndex(
      { nombre: 'text', descripcion: 'text' },
      { weights: { nombre: 10, descripcion: 5 }, name: 'obra_text_index' }
    ),
  ]);
  console.log('Índices creados');

  // FASE 4: Verificar
  console.log('\n=== FASE 4: Verificación ===');
  const artistaCount = await Artista.countDocuments();
  const obraCount = await Obra.countDocuments();
  console.log(`Artistas en MongoDB: ${artistaCount}`);
  console.log(`Obras en MongoDB: ${obraCount}`);

  await mongoose.connection.close();
  await mysqlPool.end();
  console.log('\nMigración completada exitosamente');
}

migrate().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
