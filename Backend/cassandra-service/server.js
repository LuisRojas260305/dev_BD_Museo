/**
 * Servicio de auditoría — Cassandra.
 * Punto de entrada del microservicio. Configura Express con CORS, JSON,
 * expone el health check, monta las rutas de auditoría y el manejador de errores.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'cassandra-auditoria' });
});

app.use('/api/auditoria', require('./routes/auditoria.routes'));

app.use(require('./middleware/errorHandler'));

app.listen(PORT, () => {
    console.log(`Servicio de auditoría corriendo en puerto ${PORT}`);
});
