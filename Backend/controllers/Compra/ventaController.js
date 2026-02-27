const { pool } = require('../../config/database');

// Reservar una obra (miembro)
const reservarObra = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { obra_id, codigo_seguridad } = req.body;
    const comprador_id = req.usuario.usuario_id;

    // Verificar que el usuario es miembro y el código coincide
    const [miembro] = await connection.query(
      'SELECT codigo_seguridad FROM Miembro WHERE usuario_id = ?',
      [comprador_id]
    );
    if (miembro.length === 0 || miembro[0].codigo_seguridad !== codigo_seguridad) {
      return res.status(401).json({ error: 'Código de seguridad inválido' });
    }

    // Verificar que la obra existe y está disponible
    const [obra] = await connection.query(
      'SELECT estado FROM Obra WHERE obra_id = ?',
      [obra_id]
    );
    if (obra.length === 0) return res.status(404).json({ error: 'Obra no encontrada' });
    if (obra[0].estado !== 'Disponible') {
      return res.status(409).json({ error: 'La obra no está disponible' });
    }

    // Cambiar estado a Reservada
    await connection.query(
      'UPDATE Obra SET estado = "Reservada" WHERE obra_id = ?',
      [obra_id]
    );

    // Crear venta
    const [venta] = await connection.query(
      `INSERT INTO Venta (obra_id, comprador_id, estado) VALUES (?, ?, 'reservada')`,
      [obra_id, comprador_id]
    );

    await connection.commit();
    res.json({ venta_id: venta.insertId, message: 'Obra reservada correctamente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Concretar venta (solo admin)
const concretarVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { direccion_envio } = req.body;
    const admin_id = req.usuario.usuario_id;

    // Obtener la venta
    const [venta] = await connection.query(
      'SELECT * FROM Venta WHERE venta_id = ?',
      [id]
    );
    if (venta.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta[0].estado !== 'reservada') {
      return res.status(409).json({ error: 'La venta no está en estado reservada' });
    }

    // Obtener obra y artista
    const [obra] = await connection.query(
      'SELECT o.*, a.porcentaje_ganancia FROM Obra o JOIN Artista a ON o.artista_id = a.artista_id WHERE o.obra_id = ?',
      [venta[0].obra_id]
    );
    if (obra.length === 0) throw new Error('Obra no encontrada');

    const precio = obra[0].precio_venta;
    const porcentaje = obra[0].porcentaje_ganancia;
    const iva = precio * 0.16; // Suponiendo IVA 16%
    const ganancia_museo = precio * (porcentaje / 100);
    const total = precio + iva;

    // Actualizar venta
    await connection.query(
      `UPDATE Venta SET fecha_venta = NOW(), estado = 'vendida' WHERE venta_id = ?`,
      [id]
    );

    // Actualizar obra a Vendida
    await connection.query(
      'UPDATE Obra SET estado = "Vendida" WHERE obra_id = ?',
      [venta[0].obra_id]
    );

    // Crear factura
    await connection.query(
      `INSERT INTO Factura 
       (venta_id, admin_id, precio_obra, iva, porcentaje_ganancia, ganancia_museo, total, direccion_envio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, admin_id, precio, iva, porcentaje, ganancia_museo, total, direccion_envio]
    );

    await connection.commit();
    res.json({ message: 'Venta concretada y factura generada' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Cancelar reserva (admin o el propio miembro? lo dejamos solo admin)
const cancelarVenta = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [venta] = await connection.query('SELECT * FROM Venta WHERE venta_id = ?', [id]);
    if (venta.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta[0].estado !== 'reservada') {
      return res.status(409).json({ error: 'Solo se pueden cancelar reservas' });
    }

    // Cambiar estado de obra a Disponible
    await connection.query(
      'UPDATE Obra SET estado = "Disponible" WHERE obra_id = ?',
      [venta[0].obra_id]
    );

    // Actualizar venta a cancelada
    await connection.query(
      'UPDATE Venta SET estado = "cancelada" WHERE venta_id = ?',
      [id]
    );

    await connection.commit();
    res.json({ message: 'Reserva cancelada' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  reservarObra,
  concretarVenta,
  cancelarVenta
};