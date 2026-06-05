const axios = require('axios');

const CASSANDRA_URL = process.env.CASSANDRA_URL || 'http://localhost:3002/api/auditoria';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

async function auditar(tipo_evento, usuario, severidad, metadata = {}) {
    try {
        await axios.post(`${CASSANDRA_URL}/eventos`, {
            tipo_evento, usuario, severidad, metadata
        }, {
            timeout: 4000,
            headers: { 'x-internal-key': INTERNAL_KEY }
        });
    } catch (err) {
        console.error(`Auditoría no disponible (${tipo_evento}):`, err.message);
    }
}

module.exports = { auditar };
