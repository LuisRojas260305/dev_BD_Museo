/**
 * Configuración y conexión a Neo4j (Community local, protocolo Bolt).
 * Expone el driver compartido, un helper run() para ejecutar Cypher con
 * sesiones de corta vida, y verifyConnectivity() para el arranque.
 */
const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'museo2026';
const DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

const driver = neo4j.driver(
    URI,
    neo4j.auth.basic(USER, PASSWORD),
    {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
        disableLosslessIntegers: true, // enteros JS planos en vez de objetos Integer
    }
);

/**
 * Ejecuta una consulta Cypher en una sesión efímera y devuelve los registros
 * como objetos planos.
 * @param {string} cypher - Sentencia Cypher
 * @param {Object} [params={}] - Parámetros nombrados
 * @param {Object} [opts={}] - Opciones (mode: 'READ' | 'WRITE')
 * @returns {Promise<Array<Object>>} Filas como objetos planos
 */
async function run(cypher, params = {}, opts = {}) {
    const session = driver.session({
        database: DATABASE,
        defaultAccessMode: opts.mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ,
    });
    try {
        const result = await session.run(cypher, params);
        return result.records.map(r => r.toObject());
    } finally {
        await session.close();
    }
}

/** Verifica que el driver pueda conectar con el servidor Neo4j. */
async function verifyConnectivity() {
    await driver.verifyConnectivity();
}

/** Cierra el driver (al apagar el proceso). */
async function close() {
    await driver.close();
}

module.exports = { driver, run, verifyConnectivity, close, neo4j, DATABASE };
