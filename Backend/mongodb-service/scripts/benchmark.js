// ============================================================================
//  BENCHMARK JUSTO - Comparativa equitativa entre MongoDB, MySQL y Cassandra
// ----------------------------------------------------------------------------
//  Para que la comparacion sea legitima, las tres BDs se miden con:
//    * El MISMO dataset sintetico (N registros identicos).
//    * La MISMA estructura: clave compuesta (categoria, id).
//    * Las MISMAS 5 operaciones, cada una en su forma idiomatica y SIN
//      anti-patrones (ninguna hace COUNT(*) global ni scans sin clave).
//
//  Operaciones medidas (identicas en las 3):
//    1. WRITE        - N inserts individuales, misma concurrencia.
//    2. POINT READ   - lectura por clave completa (categoria, id), repetida.
//    3. PARTITION    - traer una categoria completa (~N/CATEGORIAS filas).
//    4. RANGE        - rango de id dentro de una categoria.
//    5. COUNT/part   - contar por cada particion (idiomatico en Cassandra).
//
//  Cada BD usa su driver NATIVO (sin ODM) para no penalizar a ninguna.
// ============================================================================

require('dotenv').config();
const mongoose  = require('mongoose');
const mysql     = require('mysql2/promise');
const cassandra = require(require('path').resolve(__dirname, '../../cassandra-service/node_modules/cassandra-driver'));
const neo4j     = require(require('path').resolve(__dirname, '../../neo4j-service/node_modules/neo4j-driver'));

// ---- Parametros del benchmark (iguales para las 3 BDs) ---------------------
const N           = Number(process.env.BENCH_N)    || 5000;  // registros a insertar
const CONCURRENCY = Number(process.env.BENCH_CONC) || 100;   // escrituras/lecturas en paralelo
const CATEGORIAS  = 10;                                       // particiones logicas
const POINT_READS = 200;                                      // lecturas puntuales
const CAT_OBJETIVO = 0;                                       // categoria usada en partition/range

// Etiquetas de las operaciones, en orden (sirven para la tabla comparativa)
const OPS = [
  `WRITE  ${N} inserts (conc ${CONCURRENCY})`,
  `POINT READ x${POINT_READS} (clave completa)`,
  `PARTITION READ (1 categoria)`,
  `RANGE READ (id dentro de categoria)`,
  `COUNT por particion (x${CATEGORIAS})`,
];

// ---- Helpers ---------------------------------------------------------------
const fmt = (n) => `${n} ms`;

// Genera el dataset una sola vez; las 3 BDs insertan EXACTAMENTE lo mismo.
function generarDataset() {
  const ahora = Date.now();
  const items = new Array(N);
  for (let i = 0; i < N; i++) {
    const id = i + 1;
    items[i] = {
      id,
      categoria: id % CATEGORIAS,
      valor: Math.round(Math.random() * 100000) / 100,
      creado: new Date(ahora - i * 1000),
    };
  }
  return items;
}

// IDs aleatorios para las lecturas puntuales (los mismos para las 3 BDs).
function generarPointKeys() {
  const keys = [];
  for (let k = 0; k < POINT_READS; k++) {
    const id = 1 + Math.floor(Math.random() * N);
    keys.push({ id, categoria: id % CATEGORIAS });
  }
  return keys;
}

// Ejecuta `fn` sobre cada item con un limite de concurrencia fijo.
async function correrConcurrencia(items, concurrency, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

const DATASET = generarDataset();
const POINT_KEYS = generarPointKeys();
// Rango de id que cae dentro de CAT_OBJETIVO (ids: CAT, CAT+10, CAT+20, ...)
const RANGE_LO = CAT_OBJETIVO + CATEGORIAS * 10;       // ~ posicion 10 de la particion
const RANGE_HI = CAT_OBJETIVO + CATEGORIAS * 60;       // ~ posicion 60 de la particion

// ============================================================================
//  MySQL
// ============================================================================
async function benchmarkMySQL() {
  console.log('\n+----- MySQL / MariaDB (Museo) ----------------------+');
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'Museo',
    connectionLimit: CONCURRENCY,
    waitForConnections: true,
  });

  // Estructura identica: clave compuesta (categoria, id)
  await pool.query('DROP TABLE IF EXISTS bench_items');
  await pool.query(`
    CREATE TABLE bench_items (
      categoria INT NOT NULL,
      id        INT NOT NULL,
      valor     DOUBLE,
      creado    DATETIME,
      PRIMARY KEY (categoria, id)
    ) ENGINE=InnoDB`);

  const times = [];
  let t;

  // 1. WRITE
  t = Date.now();
  await correrConcurrencia(DATASET, CONCURRENCY, (it) =>
    pool.execute('INSERT INTO bench_items (categoria, id, valor, creado) VALUES (?, ?, ?, ?)',
      [it.categoria, it.id, it.valor, it.creado]));
  times.push(Date.now() - t);
  console.log(`| WRITE  ${N} inserts            -> [${fmt(times[0])}]`);

  // 2. POINT READ
  t = Date.now();
  await correrConcurrencia(POINT_KEYS, CONCURRENCY, (k) =>
    pool.execute('SELECT * FROM bench_items WHERE categoria = ? AND id = ?', [k.categoria, k.id]));
  times.push(Date.now() - t);
  console.log(`| POINT READ x${POINT_READS}             -> [${fmt(times[1])}]`);

  // 3. PARTITION READ
  t = Date.now();
  const [part] = await pool.execute('SELECT * FROM bench_items WHERE categoria = ?', [CAT_OBJETIVO]);
  times.push(Date.now() - t);
  console.log(`| PARTITION READ               -> ${part.length} filas  [${fmt(times[2])}]`);

  // 4. RANGE READ
  t = Date.now();
  const [rng] = await pool.execute(
    'SELECT * FROM bench_items WHERE categoria = ? AND id BETWEEN ? AND ?', [CAT_OBJETIVO, RANGE_LO, RANGE_HI]);
  times.push(Date.now() - t);
  console.log(`| RANGE READ                   -> ${rng.length} filas   [${fmt(times[3])}]`);

  // 5. COUNT por particion
  t = Date.now();
  for (let c = 0; c < CATEGORIAS; c++) {
    await pool.execute('SELECT COUNT(*) AS n FROM bench_items WHERE categoria = ?', [c]);
  }
  times.push(Date.now() - t);
  console.log(`| COUNT por particion x${CATEGORIAS}      -> [${fmt(times[4])}]`);

  console.log('+---------------------------------------------------+');
  await pool.end();
  return times;
}

// ============================================================================
//  MongoDB  (driver nativo via mongoose.connection, sin ODM)
// ============================================================================
async function benchmarkMongoDB() {
  console.log('\n+----- MongoDB (museo_catalogo) --------------------+');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/museo_catalogo');
  const col = mongoose.connection.db.collection('bench_items');

  // Estructura identica: indice compuesto (categoria, id)
  await col.drop().catch(() => {});
  await col.createIndex({ categoria: 1, id: 1 }, { unique: true });

  const times = [];
  let t;

  // 1. WRITE
  t = Date.now();
  await correrConcurrencia(DATASET, CONCURRENCY, (it) =>
    col.insertOne({ categoria: it.categoria, id: it.id, valor: it.valor, creado: it.creado }));
  times.push(Date.now() - t);
  console.log(`| WRITE  ${N} inserts            -> [${fmt(times[0])}]`);

  // 2. POINT READ
  t = Date.now();
  await correrConcurrencia(POINT_KEYS, CONCURRENCY, (k) =>
    col.findOne({ categoria: k.categoria, id: k.id }));
  times.push(Date.now() - t);
  console.log(`| POINT READ x${POINT_READS}             -> [${fmt(times[1])}]`);

  // 3. PARTITION READ
  t = Date.now();
  const part = await col.find({ categoria: CAT_OBJETIVO }).toArray();
  times.push(Date.now() - t);
  console.log(`| PARTITION READ               -> ${part.length} filas  [${fmt(times[2])}]`);

  // 4. RANGE READ
  t = Date.now();
  const rng = await col.find({ categoria: CAT_OBJETIVO, id: { $gte: RANGE_LO, $lte: RANGE_HI } }).toArray();
  times.push(Date.now() - t);
  console.log(`| RANGE READ                   -> ${rng.length} filas   [${fmt(times[3])}]`);

  // 5. COUNT por particion
  t = Date.now();
  for (let c = 0; c < CATEGORIAS; c++) {
    await col.countDocuments({ categoria: c });
  }
  times.push(Date.now() - t);
  console.log(`| COUNT por particion x${CATEGORIAS}      -> [${fmt(times[4])}]`);

  console.log('+---------------------------------------------------+');
  return times;
}

// ============================================================================
//  Cassandra
// ============================================================================
async function benchmarkCassandra() {
  console.log('\n+----- Cassandra (museo_auditoria) ------------------+');
  const client = new cassandra.Client({
    contactPoints: [(process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1')],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: 'museo_auditoria',
    socketOptions: { connectTimeout: 10000 },
  });
  try {
    await client.connect();
  } catch {
    console.log('| SKIP: Cassandra no disponible (puerto 9042 cerrado) |');
    console.log('| Inicia Cassandra antes de ejecutar el benchmark.    |');
    console.log('+-----------------------------------------------------+');
    return null;
  }

  // Estructura identica: PRIMARY KEY (categoria, id) -> particion + clustering
  await client.execute('DROP TABLE IF EXISTS bench_items');
  await client.execute(`
    CREATE TABLE bench_items (
      categoria int,
      id        int,
      valor     double,
      creado    timestamp,
      PRIMARY KEY (categoria, id)
    )`);

  const insert = 'INSERT INTO bench_items (categoria, id, valor, creado) VALUES (?, ?, ?, ?)';
  const times = [];
  let t;

  // 1. WRITE
  t = Date.now();
  await correrConcurrencia(DATASET, CONCURRENCY, (it) =>
    client.execute(insert, [it.categoria, it.id, it.valor, it.creado], { prepare: true }));
  times.push(Date.now() - t);
  console.log(`| WRITE  ${N} inserts            -> [${fmt(times[0])}]`);

  // 2. POINT READ
  t = Date.now();
  await correrConcurrencia(POINT_KEYS, CONCURRENCY, (k) =>
    client.execute('SELECT * FROM bench_items WHERE categoria = ? AND id = ?', [k.categoria, k.id], { prepare: true }));
  times.push(Date.now() - t);
  console.log(`| POINT READ x${POINT_READS}             -> [${fmt(times[1])}]`);

  // 3. PARTITION READ
  t = Date.now();
  const part = await client.execute('SELECT * FROM bench_items WHERE categoria = ?', [CAT_OBJETIVO], { prepare: true });
  times.push(Date.now() - t);
  console.log(`| PARTITION READ               -> ${part.rows.length} filas  [${fmt(times[2])}]`);

  // 4. RANGE READ (dentro de la particion: idiomatico en Cassandra)
  t = Date.now();
  const rng = await client.execute(
    'SELECT * FROM bench_items WHERE categoria = ? AND id >= ? AND id <= ?',
    [CAT_OBJETIVO, RANGE_LO, RANGE_HI], { prepare: true });
  times.push(Date.now() - t);
  console.log(`| RANGE READ                   -> ${rng.rows.length} filas   [${fmt(times[3])}]`);

  // 5. COUNT por particion (COUNT dentro de UNA particion: sin anti-patron)
  t = Date.now();
  for (let c = 0; c < CATEGORIAS; c++) {
    await client.execute('SELECT COUNT(*) FROM bench_items WHERE categoria = ?', [c], { prepare: true });
  }
  times.push(Date.now() - t);
  console.log(`| COUNT por particion x${CATEGORIAS}      -> [${fmt(times[4])}]`);

  console.log('+---------------------------------------------------+');
  await client.shutdown();
  return times;
}

// ============================================================================
//  Neo4j  (driver nativo Bolt, mismo dataset y mismas 5 operaciones)
// ----------------------------------------------------------------------------
//  Estructura identica: nodos (:BenchItem {categoria, id, valor, creado}) con
//  indice compuesto (categoria, id). Las operaciones se expresan en Cypher de
//  forma idiomatica. Usa una etiqueta propia (BenchItem) para NO tocar el grafo
//  de recomendaciones; al terminar elimina esos nodos.
// ============================================================================
async function benchmarkNeo4j() {
  console.log('\n+----- Neo4j (recomendaciones) ----------------------+');
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'museo2026'),
    { disableLosslessIntegers: true }
  );
  try {
    await driver.verifyConnectivity();
  } catch {
    console.log('| SKIP: Neo4j no disponible (puerto 7687 cerrado)     |');
    console.log('| Inicia Neo4j antes de ejecutar el benchmark.        |');
    console.log('+-----------------------------------------------------+');
    await driver.close().catch(() => {});
    return null;
  }

  const db = process.env.NEO4J_DATABASE || 'neo4j';
  const exec = (cypher, params = {}) => driver.executeQuery(cypher, params, { database: db });

  // Estructura identica: indice compuesto (categoria, id). Limpieza previa.
  await exec('MATCH (n:BenchItem) DETACH DELETE n');
  await exec('CREATE INDEX bench_cat_id IF NOT EXISTS FOR (n:BenchItem) ON (n.categoria, n.id)');

  const times = [];
  let t;

  // 1. WRITE
  t = Date.now();
  await correrConcurrencia(DATASET, CONCURRENCY, (it) =>
    exec('CREATE (n:BenchItem {categoria:$categoria, id:$id, valor:$valor, creado:$creado})',
      { categoria: it.categoria, id: it.id, valor: it.valor, creado: it.creado.toISOString() }));
  times.push(Date.now() - t);
  console.log(`| WRITE  ${N} inserts            -> [${fmt(times[0])}]`);

  // 2. POINT READ
  t = Date.now();
  await correrConcurrencia(POINT_KEYS, CONCURRENCY, (k) =>
    exec('MATCH (n:BenchItem {categoria:$categoria, id:$id}) RETURN n', { categoria: k.categoria, id: k.id }));
  times.push(Date.now() - t);
  console.log(`| POINT READ x${POINT_READS}             -> [${fmt(times[1])}]`);

  // 3. PARTITION READ
  t = Date.now();
  const part = await exec('MATCH (n:BenchItem {categoria:$categoria}) RETURN n', { categoria: CAT_OBJETIVO });
  times.push(Date.now() - t);
  console.log(`| PARTITION READ               -> ${part.records.length} filas  [${fmt(times[2])}]`);

  // 4. RANGE READ
  t = Date.now();
  const rng = await exec(
    'MATCH (n:BenchItem) WHERE n.categoria = $categoria AND n.id >= $lo AND n.id <= $hi RETURN n',
    { categoria: CAT_OBJETIVO, lo: RANGE_LO, hi: RANGE_HI });
  times.push(Date.now() - t);
  console.log(`| RANGE READ                   -> ${rng.records.length} filas   [${fmt(times[3])}]`);

  // 5. COUNT por particion
  t = Date.now();
  for (let c = 0; c < CATEGORIAS; c++) {
    await exec('MATCH (n:BenchItem {categoria:$categoria}) RETURN count(n) AS n', { categoria: c });
  }
  times.push(Date.now() - t);
  console.log(`| COUNT por particion x${CATEGORIAS}      -> [${fmt(times[4])}]`);

  // Limpieza: no dejar los nodos de benchmark en el grafo de recomendaciones
  await exec('MATCH (n:BenchItem) DETACH DELETE n');
  console.log('+---------------------------------------------------+');
  await driver.close();
  return times;
}

// ============================================================================
//  Tabla comparativa por operacion
// ============================================================================
function imprimirComparativa(resultados) {
  // resultados: [{ nombre, times[] }, ...]  (times alineados con OPS)
  const activos = resultados.filter(r => r.times && r.times.length === OPS.length);
  if (activos.length === 0) return;

  console.log('\n+============================================================================+');
  console.log('|              COMPARATIVA POR OPERACION (mismo dataset y queries)           |');
  console.log('+============================================================================+');

  const header = 'Operacion'.padEnd(34) + activos.map(a => a.nombre.padStart(12)).join('');
  console.log('  ' + header);
  console.log('  ' + '-'.repeat(header.length));

  OPS.forEach((op, i) => {
    const fila = op.padEnd(34) + activos.map(a => `${a.times[i]} ms`.padStart(12)).join('');
    // Marca el ganador de cada operacion con *
    const min = Math.min(...activos.map(a => a.times[i]));
    const ganador = activos.find(a => a.times[i] === min);
    console.log('  ' + fila + `   <- ${ganador.nombre}`);
  });
  console.log('  ' + '-'.repeat(header.length));
}

// ============================================================================
//  Ranking final por promedio
// ============================================================================
function imprimirRanking(resultados) {
  const bds = resultados
    .filter(b => b.times && b.times.length > 0)
    .map(b => ({
      nombre: b.nombre,
      avg: Math.round(b.times.reduce((a, n) => a + n, 0) / b.times.length),
      min: Math.min(...b.times),
      max: Math.max(...b.times),
    }))
    .sort((a, b) => a.avg - b.avg);

  if (bds.length === 0) return;
  const maxAvg = bds[bds.length - 1].avg || 1;
  const medallas = ['1er lugar', '2do lugar', '3er lugar', '4to lugar'];
  const trofeos  = ['[GANADOR]', '[2do]    ', '[3ro]    ', '[4to]    '];

  console.log('\n+============================================================+');
  console.log('|         RANKING FINAL - PROMEDIO DE LAS 5 OPERACIONES     |');
  console.log('+============================================================+');
  console.log('|  BD          | Promedio |  Minimo  |  Maximo  | Barra      |');
  console.log('+==============+==========+==========+==========+============+');

  bds.forEach((b, i) => {
    const filled = Math.max(1, Math.round((b.avg / maxAvg) * 10));
    const bar = '#'.repeat(filled) + '.'.repeat(10 - filled);
    const nombre = b.nombre.padEnd(12);
    const avg = String(b.avg + ' ms').padStart(8);
    const min = String(b.min + ' ms').padStart(8);
    const max = String(b.max + ' ms').padStart(8);
    console.log(`| ${trofeos[i]} ${nombre}| ${avg} | ${min} | ${max} | ${bar} |`);
  });
  console.log('+==============+==========+==========+==========+============+');

  console.log('\n  RESULTADO:');
  bds.forEach((b, i) => {
    const stars = '*'.repeat(bds.length - i);
    console.log(`  ${stars} ${medallas[i].padEnd(10)}  ${b.nombre}  (${b.avg} ms promedio)`);
  });
  console.log('\n  Nota: cada BD destaca en operaciones distintas. Revisa la');
  console.log('  comparativa por operacion para ver donde gana cada una.');
  console.log('\n+============================================================+\n');
}

// ============================================================================
//  Main
// ============================================================================
async function main() {
  console.log('+============================================================+');
  console.log('|   BENCHMARK JUSTO - mismo dataset, mismas queries, 4 BDs   |');
  console.log(`|   N=${N} registros | concurrencia=${CONCURRENCY} | ${CATEGORIAS} particiones`.padEnd(60) + ' |');
  console.log('+============================================================+');

  const resultados = [
    { nombre: 'MySQL',     times: null },
    { nombre: 'MongoDB',   times: null },
    { nombre: 'Cassandra', times: null },
    { nombre: 'Neo4j',     times: null },
  ];

  try {
    resultados[0].times = await benchmarkMySQL();
    resultados[1].times = await benchmarkMongoDB();
    resultados[2].times = await benchmarkCassandra();
    resultados[3].times = await benchmarkNeo4j();
  } catch (e) {
    console.error('\nError en benchmark:', e.message);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }

  imprimirComparativa(resultados);
  imprimirRanking(resultados);
  console.log('Benchmark completado.');
}

main();
