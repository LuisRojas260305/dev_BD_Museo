function errorHandler(err, req, res, next) {
    console.error('Error:', err.message);
    
    if (err.code === 'CassandraError' || (err.message && err.message.includes('All host(s)'))) {
        return res.status(503).json({ error: 'Servicio de auditoría no disponible' });
    }
    
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
}

module.exports = errorHandler;
