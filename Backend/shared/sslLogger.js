// SSL — Logger estructurado
// Registro de eventos SSL en formato JSON para trazabilidad.
const logEvent = (ssl_id, evento, metadata = {}) => {
    const entry = {
        ssl_id,
        evento,
        timestamp: new Date().toISOString(),
        metadata,
        servicio: 'museo-api',
    };
    console.log(JSON.stringify(entry));
    return entry;
};

module.exports = { logEvent };
