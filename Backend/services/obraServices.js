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

// Actualizar Pintura y sus relaciones M:M
const updatePintura = async (connection, obraId, data) => {
  const { soporte_id, estilos, tematicas } = data;
  await connection.query('UPDATE Pintura SET soporte_id = ? WHERE obra_id = ?', [soporte_id, obraId]);
  
  await connection.query('DELETE FROM Pintura_Estilo WHERE obra_id = ?', [obraId]);
  if (estilos && Array.isArray(estilos)) {
    for (const id of estilos) await connection.query('INSERT INTO Pintura_Estilo (obra_id, estilo_id) VALUES (?, ?)', [obraId, id]);
  }

  await connection.query('DELETE FROM Pintura_Tematica WHERE obra_id = ?', [obraId]);
  if (tematicas && Array.isArray(tematicas)) {
    for (const id of tematicas) await connection.query('INSERT INTO Pintura_Tematica (obra_id, tematica_id) VALUES (?, ?)', [obraId, id]);
  }
};

// Actualizar Escultura y sus relaciones M:M
const updateEscultura = async (connection, obraId, data) => {
  const { tipo_id, peso, profundidad, materiales, tecnicas } = data;
  await connection.query(
    'UPDATE Escultura SET tipo_id = ?, peso = ?, profundidad = ? WHERE obra_id = ?',
    [tipo_id, peso || 0, profundidad || 0, obraId]
  );

  await connection.query('DELETE FROM Escultura_Material WHERE obra_id = ?', [obraId]);
  if (materiales && Array.isArray(materiales)) {
    for (const id of materiales) await connection.query('INSERT INTO Escultura_Material (obra_id, material_id) VALUES (?, ?)', [obraId, id]);
  }

  await connection.query('DELETE FROM Escultura_Tecnica WHERE obra_id = ?', [obraId]);
  if (tecnicas && Array.isArray(tecnicas)) {
    for (const id of tecnicas) await connection.query('INSERT INTO Escultura_Tecnica (obra_id, tecnica_id) VALUES (?, ?)', [obraId, id]);
  }
};

// Actualizar Fotografía
const updateFotografia = async (connection, obraId, data) => {
  const { tiraje, obturacion, apertura, iso, resolucion, fecha_captura, impresion_id, camara_id, tecnica_id } = data;
  await connection.query(
    `UPDATE Fotografia SET tiraje=?, obturacion=?, apertura=?, iso=?, resolucion=?, fecha_captura=?, impresion_id=?, camara_id=?, tecnica_id=? WHERE obra_id=?`,
    [tiraje || 1, obturacion, apertura, iso, resolucion, fecha_captura, impresion_id, camara_id, tecnica_id, obraId]
  );
};

// Actualizar Cerámica
const updateCeramica = async (connection, obraId, data) => {
  const { profundidad, diametro, funcionalidad, coccion_id, arcilla_id, modelado_id, esmaltado_id } = data;
  await connection.query(
    `UPDATE Ceramica SET profundidad=?, diametro=?, funcionalidad=?, coccion_id=?, arcilla_id=?, modelado_id=?, esmaltado_id=? WHERE obra_id=?`,
    [profundidad || 0, diametro || 0, funcionalidad || 'Desconocido', coccion_id, arcilla_id, modelado_id, esmaltado_id, obraId]
  );
};

// Actualizar Orfebrería
const updateOrfebreria = async (connection, obraId, data) => {
  const { profundidad, diametro, peso, pieza_id, metal_predominante_id, otros_metales } = data;
  await connection.query(
    `UPDATE Orfebreria SET profundidad=?, diametro=?, peso=?, pieza_id=?, metal_predominante_id=? WHERE obra_id=?`,
    [profundidad || 0, diametro || 0, peso, pieza_id, metal_predominante_id, obraId]
  );

  await connection.query('DELETE FROM Orfebreria_Metales WHERE obra_id = ?', [obraId]);
  if (otros_metales && Array.isArray(otros_metales)) {
    for (const id of otros_metales) await connection.query('INSERT INTO Orfebreria_Metales (obra_id, metal_id) VALUES (?, ?)', [obraId, id]);
  }
};

module.exports = {
  insertPintura,
  insertEscultura,
  insertFotografia,
  insertCeramica,
  insertOrfebreria, 
  updatePintura, 
  updateEscultura, 
  updateFotografia, 
  updateCeramica, 
  updateOrfebreria
};