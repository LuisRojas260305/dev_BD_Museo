const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: 'ID inválido',
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'El recurso ya existe',
    });
  }

  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;
