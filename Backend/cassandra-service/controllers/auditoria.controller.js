const eventosModel = require('../models/eventos');
const resumenesModel = require('../models/resumenes');

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

async function healthCheck(req, res) {
    try {
        const { client } = require('../config/cassandra');
        // Verificar conectividad ejecutando una consulta simple
        await client.execute('SELECT release_version FROM system.local');
        res.json({ status: 'ok', cassandra: 'connected' });
    } catch {
        res.status(503).json({ status: 'error', cassandra: 'disconnected' });
    }
}

module.exports = { createEvent, getEvents, getReports, healthCheck };
