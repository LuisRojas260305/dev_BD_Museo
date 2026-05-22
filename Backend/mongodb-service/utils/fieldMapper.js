const fieldMapper = (obra) => {
  return {
    ...obra,
    artista_nombre: obra.artista
      ? `${obra.artista.nombre || ''} ${obra.artista.apellido || ''}`.trim()
      : null,
    genero_nombre: obra.genero,
    obra_id: obra.obra_id_original || obra._id,
    precio_venta: obra.precio_venta
      ? Number(obra.precio_venta._serialized || obra.precio_venta)
      : 0,
  };
};

module.exports = fieldMapper;
