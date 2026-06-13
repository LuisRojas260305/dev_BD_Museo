/**
 * Manejador global de errores Express.
 * Detecta errores de conectividad de Neo4j (ServiceUnavailable / Bolt) y
 * responde con 503; el resto se responde con el código HTTP del error o 500.
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err.message);

    const msg = err.message || '';
    if (
        err.code === 'ServiceUnavailable' ||
        err.code === 'SessionExpired' ||
        msg.includes('Could not perform discovery') ||
        msg.includes('Connection refused') ||
        msg.includes('ECONNREFUSED')
    ) {
        return res.status(503).json({ error: 'Servicio de recomendaciones (Neo4j) no disponible' });
    }

    res.status(err.status || 500).json({
        error: msg || 'Error interno del servidor'
    });
}

module.exports = errorHandler;
