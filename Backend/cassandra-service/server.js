require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check básico
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'cassandra-auditoria' });
});

// Rutas
app.use('/api/auditoria', require('./routes/auditoria.routes'));

// Error handler
app.use(require('./middleware/errorHandler'));

app.listen(PORT, () => {
    console.log(`Servicio de auditoría corriendo en puerto ${PORT}`);
});
