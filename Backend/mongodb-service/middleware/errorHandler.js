/**
 * Global error handling middleware.
 * Normalizes Mongoose validation errors, CastErrors, duplicate key errors,
 * and generic errors into a consistent JSON response format.
 */

/**
 * Express error-handling middleware (4-argument signature).
 * Handles Mongoose ValidationError, CastError, duplicate key (11000),
 * and generic server errors with appropriate HTTP status codes.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
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
