/**
 * Logger estructurado para eventos SSL.
 * Genera entradas en formato JSON para trazabilidad.
 *
 * @param {string} ssl_id - ID del contexto SSL
 * @param {string} evento - Nombre del evento
 * @param {Object} [metadata={}] - Datos adicionales
 * @returns {Object} Entrada de log generada
 */
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
