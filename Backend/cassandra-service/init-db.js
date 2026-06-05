require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cassandra = require('cassandra-driver');

// Conexión sin keyspace para poder crearlo
const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
});

async function init() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra');

        const schemaPath = path.join(__dirname, 'scripts', 'schema.cql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Separar statements por punto y coma y ejecutar cada uno
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
            console.log(`Ejecutando: ${stmt.substring(0, 80)}...`);
            await client.execute(stmt + ';');
        }

        console.log('Schema CQL ejecutado exitosamente');
        console.log('Keyspace museo_auditoria listo');
    } catch (err) {
        console.error('Error inicializando schema:', err.message);
        process.exit(1);
    } finally {
        await client.shutdown();
    }
}

init();
