const validateCatalogQuery = (req, res, next) => {
  const { page, limit, precio_min, precio_max, genero, estado } = req.query;

  if (genero && !['Pintura', 'Escultura', 'Orfebrería', 'Cerámica', 'Fotografía'].includes(genero)) {
    return res.status(400).json({
      success: false,
      error: 'Género inválido. Valores: Pintura, Escultura, Orfebrería, Cerámica, Fotografía',
    });
  }

  if (estado && !['Disponible', 'Reservada', 'Vendida'].includes(estado)) {
    return res.status(400).json({
      success: false,
      error: 'Estado inválido. Valores: Disponible, Reservada, Vendida',
    });
  }

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'page debe ser >= 1',
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      error: 'limit debe estar entre 1 y 100',
    });
  }

  if (precio_min && precio_max && parseFloat(precio_min) > parseFloat(precio_max)) {
    return res.status(400).json({
      success: false,
      error: 'precio_max debe ser mayor que precio_min',
    });
  }

  next();
};

const validateSearchQuery = (req, res, next) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'q debe tener al menos 2 caracteres',
    });
  }

  return validateCatalogQuery(req, res, next);
};

module.exports = { validateCatalogQuery, validateSearchQuery };
