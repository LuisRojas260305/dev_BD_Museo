const { pool } = require('../../config/database');
const crypto = require('crypto');
const axios = require('axios');
const { auditar } = require('../../services/auditoriaHelper');

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3001/api/catalog';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'museo_internal_key_2026';

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

    // Verificar obra desde MongoDB vía catálogo
    const catRes = await axios.get(`${CATALOG_URL}/${obra_id}`, {
      headers: { 'x-internal-key': INTERNAL_KEY },
      timeout: 5000
    });
    const obra = catRes.data?.data;
    if (!obra || obra.estado !== 'Disponible') {
      return res.status(409).json({ error: 'La obra no está disponible' });
    }

    // Actualizar estado en MongoDB
    await axios.put(`${CATALOG_URL}/${obra_id}`,
      { estado: 'Reservada' },
      { headers: { 'x-internal-key': INTERNAL_KEY }, timeout: 5000 }
    );

    // Extraer datos del artista y precio
    const artistaNombre = obra.artista?.nombre_completo
      || (obra.artista?.nombre ? `${obra.artista.nombre}${obra.artista?.apellido ? ' ' + obra.artista.apellido : ''}` : 'Desconocido');
    const precioVenta = parseFloat(obra.precio_venta?.$numberDecimal || obra.precio_venta || 0);
    const porcentajeGanancia = parseFloat(obra.artista?.porcentaje_ganancia?.$numberDecimal || obra.artista?.porcentaje_ganancia || 5);

    // Crear venta con columnas denormalizadas
    const [venta] = await connection.query(
      `INSERT INTO Venta (obra_id, comprador_id, obra_nombre, artista_nombre, precio_venta, porcentaje_ganancia, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'reservada')`,
      [obra_id, comprador_id, obra.nombre, artistaNombre, precioVenta, porcentajeGanancia]
    );

    await connection.commit();
    const solicitudId = require('crypto').randomUUID();
    auditar('solicitud_compra', req.usuario.email, 'info', {
      obra_id,
      venta_id: venta.insertId,
      solicitud_id: solicitudId
    });
    auditar('reserva_creada', req.usuario.email, 'info', {
      obra_id,
      venta_id: venta.insertId,
      obra_nombre: obra.nombre,
      comprador_id
    });
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

    // Obtener la venta (con datos denormalizados — sin JOIN a Obra/Artista)
    const [venta] = await connection.query(
      'SELECT * FROM Venta WHERE venta_id = ?',
      [id]
    );
    if (venta.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta[0].estado !== 'reservada') {
      return res.status(409).json({ error: 'La venta no está en estado reservada' });
    }

    // Usar datos denormalizados de Venta
    const precio = parseFloat(venta[0].precio_venta);
    const porcentaje = parseFloat(venta[0].porcentaje_ganancia || 5);
    const iva = precio * 0.16; // Suponiendo IVA 16%
    const ganancia_museo = precio * (porcentaje / 100);
    const total = precio + iva;

    // Actualizar venta
    await connection.query(
      `UPDATE Venta SET fecha_venta = NOW(), estado = 'vendida' WHERE venta_id = ?`,
      [id]
    );

    // Crear factura con datos denormalizados (obra_nombre, artista_nombre)
    const [factura] = await connection.query(
      `INSERT INTO Factura 
       (venta_id, admin_id, obra_nombre, artista_nombre, precio_obra, iva, porcentaje_ganancia, ganancia_museo, total, direccion_envio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, admin_id, venta[0].obra_nombre, venta[0].artista_nombre, precio, iva, porcentaje, ganancia_museo, total, direccion_envio]
    );

    await connection.commit();
    auditar('compra_aceptada', req.usuario.email, 'info', {
      venta_id: id,
      admin_id,
      obra_id: venta[0].obra_id,
      obra_nombre: venta[0].obra_nombre,
      total,
      factura_id: factura.insertId
    });
    res.json({ message: 'Venta concretada y factura generada' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Cancelar reserva (admin)
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

    // Actualizar estado en MongoDB
    await axios.put(`${CATALOG_URL}/${venta[0].obra_id}`,
      { estado: 'Disponible' },
      { headers: { 'x-internal-key': INTERNAL_KEY }, timeout: 5000 }
    );

    // Actualizar venta a cancelada
    await connection.query(
      'UPDATE Venta SET estado = "cancelada" WHERE venta_id = ?',
      [id]
    );

    await connection.commit();
    auditar('compra_rechazada', req.usuario.email, 'warning', {
      venta_id: id,
      obra_id: venta[0].obra_id,
      motivo: 'Cancelada por administrador'
    });
    auditar('reserva_cancelada', req.usuario.email, 'warning', {
      venta_id: id,
      obra_id: venta[0].obra_id,
      motivo: 'Cancelada por administrador'
    });
    res.json({ message: 'Reserva cancelada' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Listar ventas (admin) — usa columnas denormalizadas, sin JOIN a Obra/Artista
const getVentas = async (req, res) => {
    try {
        const { estado } = req.query;
        let query = `
            SELECT v.*, u.email as comprador_email, u.nombre as comprador_nombre
            FROM Venta v
            JOIN Usuario u ON v.comprador_id = u.usuario_id
        `;
        const params = [];
        if (estado) {
            query += ' WHERE v.estado = ?';
            params.push(estado);
        }
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener todas las facturas (solo admin) — usa columnas denormalizadas
const getFacturas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.*, v.obra_id, v.comprador_id,
             u.nombre as comprador_nombre, u.email as comprador_email
      FROM Factura f
      JOIN Venta v ON f.venta_id = v.venta_id
      JOIN Usuario u ON v.comprador_id = u.usuario_id
      ORDER BY f.fecha_emision DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener una factura por ID (solo admin)
const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT f.*, v.obra_id, v.comprador_id,
             u.nombre as comprador_nombre, u.email as comprador_email
      FROM Factura f
      JOIN Venta v ON f.venta_id = v.venta_id
      JOIN Usuario u ON v.comprador_id = u.usuario_id
      WHERE f.factura_id = ?
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  reservarObra,
  concretarVenta,
  cancelarVenta,
  getVentas,
  getFacturas,
  getFacturaById
};