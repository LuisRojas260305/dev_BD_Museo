const { pool } = require('../../config/database');

// Listado de obras vendidas en un período
const obrasVendidasPorPeriodo = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Debe proporcionar desde y hasta' });
    }

    const [rows] = await pool.query(`
      SELECT v.venta_id, v.fecha_venta, v.obra_id, v.obra_nombre, v.precio_venta, v.artista_nombre
      FROM Venta v
      WHERE v.estado = 'vendida' AND v.fecha_venta BETWEEN ? AND ?
    `, [desde, hasta]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resumen de facturación por período
const resumenFacturacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Debe proporcionar desde y hasta' });
    }

    const [rows] = await pool.query(`
      SELECT f.*, v.obra_id, v.obra_nombre
      FROM Factura f
      JOIN Venta v ON f.venta_id = v.venta_id
      WHERE f.fecha_emision BETWEEN ? AND ?
    `, [desde, hasta]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resumen de membresías por período
const resumenMembresias = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Debe proporcionar desde y hasta' });
    }

    const [rows] = await pool.query(`
      SELECT DATE(fecha_pago) as fecha, COUNT(*) as cantidad, SUM(monto) as total
      FROM Membresia
      WHERE fecha_pago BETWEEN ? AND ?
      GROUP BY DATE(fecha_pago)
      ORDER BY fecha
    `, [desde, hasta]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  obrasVendidasPorPeriodo,
  resumenFacturacion,
  resumenMembresias
};