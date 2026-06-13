/**
 * Servicio de recomendaciones - Neo4j (Sprint 3).
 * Punto de entrada del microservicio. Configura Express con CORS, JSON,
 * expone el health check, monta rutas de recomendaciones + panel admin y el
 * manejador de errores. Al arrancar aplica los constraints del grafo con
 * reintentos (Neo4j puede tardar en levantar).
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { run, verifyConnectivity, close } = require('./config/neo4j');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'neo4j-recomendaciones' });
});

app.use('/api/recomendaciones', require('./routes/recomendaciones.routes'));
app.use('/admin', require('./routes/admin.routes'));

app.use(require('./middleware/errorHandler'));

/** Aplica schema.cypher (constraints/índices) con reintentos. */
async function initSchema(maxIntentos = 15, esperaMs = 6000) {
    const ruta = path.join(__dirname, 'scripts', 'schema.cypher');
    const sentencias = fs.readFileSync(ruta, 'utf8')
        .split(';')
        .map(s => s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').trim())
        .filter(s => s.length > 0);

    for (let i = 1; i <= maxIntentos; i++) {
        try {
            await verifyConnectivity();
            for (const stmt of sentencias) {
                await run(stmt, {}, { mode: 'WRITE' });
            }
            console.log('Schema Neo4j verificado.');
            return;
        } catch (err) {
            if (i < maxIntentos) {
                console.log(`Neo4j no listo (intento ${i}/${maxIntentos}): ${err.message}. Reintentando en ${esperaMs / 1000}s...`);
                await new Promise(r => setTimeout(r, esperaMs));
            } else {
                console.error('No se pudo inicializar schema Neo4j:', err.message);
            }
        }
    }
}

app.listen(PORT, () => {
    console.log(`Servicio de recomendaciones (Neo4j) corriendo en puerto ${PORT}`);
});

initSchema();

// Cierre limpio del driver
process.on('SIGINT', async () => { await close().catch(() => {}); process.exit(0); });
process.on('SIGTERM', async () => { await close().catch(() => {}); process.exit(0); });
