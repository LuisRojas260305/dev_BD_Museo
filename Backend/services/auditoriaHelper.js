const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';

async function auditar(tipo_evento, usuario, severidad, metadata = {}) {
    try {
        await axios.post(`${CASSANDRA_URL}/eventos`, {
            tipo_evento, usuario, severidad, metadata
        }, { timeout: 2000 });
    } catch (err) {
        console.error(`Auditoría no disponible (${tipo_evento}):`, err.message);
    }
}

module.exports = { auditar };
