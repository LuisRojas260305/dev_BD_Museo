const insertPintura = async (connection, obraId, data) => {
  const { soporte_id, estilos, tematicas } = data;

  // Insertar en Pintura
  await connection.query(
    'INSERT INTO Pintura (obra_id, soporte_id) VALUES (?, ?)',
    [obraId, soporte_id]
  );

  // Insertar estilos
  if (estilos && Array.isArray(estilos)) {
    for (const estiloId of estilos) {
      await connection.query(
        'INSERT INTO Pintura_Estilo (obra_id, estilo_id) VALUES (?, ?)',
        [obraId, estiloId]
      );
    }
  }

  // Insertar temáticas
  if (tematicas && Array.isArray(tematicas)) {
    for (const tematicaId of tematicas) {
      await connection.query(
        'INSERT INTO Pintura_Tematica (obra_id, tematica_id) VALUES (?, ?)',
        [obraId, tematicaId]
      );
    }
  }
};

const insertEscultura = async (connection, obraId, data) => {
  const { tipo_id, peso, profundidad, materiales, tecnicas } = data;

  await connection.query(
    'INSERT INTO Escultura (obra_id, tipo_id, peso, profundidad) VALUES (?, ?, ?, ?)',
    [obraId, tipo_id, peso || 0, profundidad || 0]
  );

  if (materiales && Array.isArray(materiales)) {
    for (const materialId of materiales) {
      await connection.query(
        'INSERT INTO Escultura_Material (obra_id, material_id) VALUES (?, ?)',
        [obraId, materialId]
      );
    }
  }

  if (tecnicas && Array.isArray(tecnicas)) {
    for (const tecnicaId of tecnicas) {
      await connection.query(
        'INSERT INTO Escultura_Tecnica (obra_id, tecnica_id) VALUES (?, ?)',
        [obraId, tecnicaId]
      );
    }
  }
};

const insertFotografia = async (connection, obraId, data) => {
  const { tiraje, obturacion, apertura, iso, resolucion, fecha_captura,
          impresion_id, camara_id, tecnica_id } = data;

  await connection.query(
    `INSERT INTO Fotografia 
     (obra_id, tiraje, obturacion, apertura, iso, resolucion, fecha_captura, impresion_id, camara_id, tecnica_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [obraId, tiraje || 1, obturacion, apertura, iso, resolucion, fecha_captura,
     impresion_id, camara_id, tecnica_id]
  );
};

const insertCeramica = async (connection, obraId, data) => {
  const { profundidad, diametro, funcionalidad, coccion_id, arcilla_id, modelado_id, esmaltado_id } = data;

  await connection.query(
    `INSERT INTO Ceramica 
     (obra_id, profundidad, diametro, funcionalidad, coccion_id, arcilla_id, modelado_id, esmaltado_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [obraId, profundidad || 0, diametro || 0, funcionalidad || 'Desconocido',
     coccion_id, arcilla_id, modelado_id, esmaltado_id]
  );
};

const insertOrfebreria = async (connection, obraId, data) => {
  const { profundidad, diametro, peso, pieza_id, metal_predominante_id, otros_metales } = data;

  await connection.query(
    `INSERT INTO Orfebreria 
     (obra_id, profundidad, diametro, peso, pieza_id, metal_predominante_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [obraId, profundidad || 0, diametro || 0, peso, pieza_id, metal_predominante_id]
  );

  if (otros_metales && Array.isArray(otros_metales)) {
    for (const metalId of otros_metales) {
      await connection.query(
        'INSERT INTO Orfebreria_Metales (obra_id, metal_id) VALUES (?, ?)',
        [obraId, metalId]
      );
    }
  }
};

module.exports = {
  insertPintura,
  insertEscultura,
  insertFotografia,
  insertCeramica,
  insertOrfebreria
};