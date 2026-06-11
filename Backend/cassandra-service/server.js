/**
 * Servicio de auditoría - Cassandra.
 * Punto de entrada del microservicio. Configura Express con CORS, JSON,
 * expone el health check, monta las rutas de auditoría y el manejador de errores.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cassandra = require('cassandra-driver');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'cassandra-auditoria' });
});

app.use('/api/auditoria', require('./routes/auditoria.routes'));
app.use('/api/visitas', require('./routes/visitas.routes'));
app.use('/admin', require('./routes/admin.routes'));

app.use(require('./middleware/errorHandler'));

async function initSchema(maxIntentos = 15, esperaMs = 8000) {
    for (let i = 1; i <= maxIntentos; i++) {
        const client = new cassandra.Client({
            contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
            localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
            socketOptions: { connectTimeout: 10000 },
        });
        try {
            await client.connect();
            const schema = fs.readFileSync(path.join(__dirname, 'scripts', 'schema.cql'), 'utf8');
            const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
            for (const stmt of statements) {
                await client.execute(stmt + ';');
            }
            console.log('Schema Cassandra verificado.');
            await client.shutdown().catch(() => {});
            return;
        } catch (err) {
            await client.shutdown().catch(() => {});
            if (i < maxIntentos) {
                console.log(`Cassandra no lista (intento ${i}/${maxIntentos}): ${err.message}. Reintentando en ${esperaMs / 1000}s...`);
                await new Promise(r => setTimeout(r, esperaMs));
            } else {
                console.error('No se pudo inicializar schema Cassandra:', err.message);
            }
        }
    }
}

app.listen(PORT, () => {
    console.log(`Servicio de auditoria corriendo en puerto ${PORT}`);
});

initSchema();
