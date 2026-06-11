const { client } = require('../config/cassandra');

async function registrarVisita(obra_id) {
    const hoy = new Date().toISOString().slice(0, 10);
    await Promise.all([
        client.execute(
            'UPDATE museo_auditoria.visitas_obra SET total = total + 1 WHERE obra_id = ? AND fecha = ?',
            [obra_id, hoy],
            { prepare: true }
        ),
        client.execute(
            'UPDATE museo_auditoria.visitas_totales SET total = total + 1 WHERE obra_id = ?',
            [obra_id],
            { prepare: true }
        ),
    ]);
}

async function obtenerVisitasObra(obra_id) {
    const [totRow, diasRows] = await Promise.all([
        client.execute(
            'SELECT total FROM museo_auditoria.visitas_totales WHERE obra_id = ?',
            [obra_id],
            { prepare: true }
        ),
        client.execute(
            'SELECT fecha, total FROM museo_auditoria.visitas_obra WHERE obra_id = ? LIMIT 30',
            [obra_id],
            { prepare: true }
        ),
    ]);
    return {
        total: totRow.rows[0] ? totRow.rows[0].total.toNumber() : 0,
        ultimos_dias: diasRows.rows.map(r => ({
            fecha: r.fecha,
            total: r.total.toNumber(),
        })),
    };
}

async function topObras(limite = 10) {
    const r = await client.execute(
        `SELECT obra_id, total FROM museo_auditoria.visitas_totales LIMIT ${limite}`
    );
    return r.rows
        .map(row => ({ obra_id: row.obra_id, total: row.total.toNumber() }))
        .sort((a, b) => b.total - a.total);
}

module.exports = { registrarVisita, obtenerVisitasObra, topObras };
