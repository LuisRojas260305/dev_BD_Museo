/**
 * Controladores HTTP para el microservicio de auditoría.
 * Cada función maneja un endpoint: registro de eventos, consulta,
 * reportes diarios y health check contra Cassandra.
 */
const eventosModel = require('../models/eventos');
const resumenesModel = require('../models/resumenes');

/**
 * Crea un evento de auditoría y actualiza el resumen diario (fire-and-forget).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function createEvent(req, res, next) {
    try {
        const { tipo_evento, severidad, metadata } = req.body;
        if (!tipo_evento || !req.body.usuario) {
            return res.status(400).json({ error: 'tipo_evento y usuario son obligatorios' });
        }
        if (!['info', 'warning', 'critical'].includes(severidad)) {
            return res.status(400).json({ error: 'Severidad debe ser info, warning o critical' });
        }

        const ip = req.ip || req.connection?.remoteAddress;
        const usuario = req.body.usuario;

        const result = await eventosModel.registrarEvento({
            tipo_evento, usuario, severidad, metadata, ip
        });

        // Actualizar resumen (fuego-olvido dentro del mismo servicio)
        try {
            const hoy = new Date().toISOString().split('T')[0];
            await resumenesModel.actualizarResumen(tipo_evento, hoy);
        } catch { /* resumen no crítico */ }

        res.status(201).json({ mensaje: 'Evento registrado', id: result.id });
    } catch (err) {
        if (err.code === 'CassandraError' || err.message?.includes('All host(s)')) {
            return res.status(503).json({ error: 'Servicio de auditoría no disponible' });
        }
        next(err);
    }
}

/**
 * Consulta eventos de auditoría con filtros opcionales (tipo, rango de fechas, límite).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getEvents(req, res, next) {
    try {
    const { tipo, tipo_evento, desde, hasta, limite } = req.query;
    const tipoEvento = tipo || tipo_evento || null;

    const eventos = await eventosModel.consultarEventos({
        tipo_evento: tipoEvento, desde, hasta, limite: parseInt(limite) || 100
    });
        res.json({ success: true, data: eventos, total: eventos.length });
    } catch (err) {
        next(err);
    }
}

/**
 * Devuelve reportes/resúmenes diarios filtrados por tipo de evento y fecha.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getReports(req, res, next) {
    try {
        const { tipo, fecha } = req.query;
        if (!fecha) return res.status(400).json({ error: "El parámetro 'fecha' es obligatorio" });

        const reportes = await resumenesModel.consultarResumenes({ tipo_evento: tipo, fecha });
        res.json({ success: true, data: reportes });
    } catch (err) {
        next(err);
    }
}

/**
 * Health check que verifica la conectividad con Cassandra ejecutando una consulta simple.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function healthCheck(req, res) {
    try {
        const { client } = require('../config/cassandra');
        await client.execute('SELECT release_version FROM system.local');
        res.json({ status: 'ok', cassandra: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', cassandra: 'disconnected' });
    }
}

module.exports = { createEvent, getEvents, getReports, healthCheck };
