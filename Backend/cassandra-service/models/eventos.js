const { client } = require('../config/cassandra');
const cassandra = require('cassandra-driver');

const INSERT_EVENTO = `
    INSERT INTO eventos_auditoria (mes, timestamp, id, tipo_evento, usuario, severidad, metadata, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

const QUERY_EVENTOS = `
    SELECT * FROM eventos_auditoria
    WHERE mes = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC LIMIT ?
`;

const QUERY_EVENTOS_SIN_DESDE = `
    SELECT * FROM eventos_auditoria
    WHERE mes = ? AND timestamp <= ?
    ORDER BY timestamp DESC LIMIT ?
`;

function* mesesEntre(desde, hasta) {
    let d = new Date(desde);
    const h = new Date(hasta);
    while (d <= h) {
        const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        yield mes;
        d.setMonth(d.getMonth() + 1);
    }
}

async function registrarEvento({ tipo_evento, usuario, severidad, metadata, ip }) {
    const ahora = new Date();
    const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const id = cassandra.types.TimeUuid.now();
    const metaStr = metadata ? JSON.stringify(metadata) : '{}';

    await client.execute(INSERT_EVENTO, [
        mes, ahora, id, tipo_evento, usuario, severidad, metaStr, ip || null
    ], { prepare: true });

    return { id: id.toString(), timestamp: ahora };
}

async function consultarEventos({ tipo_evento, desde, hasta, limite = 100 }) {
    const inicio = desde ? new Date(desde) : new Date('2000-01-01');
    const fin = hasta ? new Date(hasta) : new Date();
    const max = Math.min(limite, 1000);

    const resultados = [];
    for (const mes of mesesEntre(inicio, fin)) {
        const params = desde
            ? [mes, inicio, fin, max - resultados.length]
            : [mes, fin, max - resultados.length];
        const query = desde ? QUERY_EVENTOS : QUERY_EVENTOS_SIN_DESDE;

        const rs = await client.execute(query, params, { prepare: true });
        resultados.push(...rs.rows);
        if (resultados.length >= max) break;
    }

    let filtrados = tipo_evento
        ? resultados.filter(row => row.tipo_evento === tipo_evento)
        : resultados;

    return filtrados.slice(0, max).map(row => ({
        id: row.id.toString(),
        timestamp: row.timestamp,
        mes: row.mes,
        tipo_evento: row.tipo_evento,
        usuario: row.usuario,
        severidad: row.severidad,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        ip: row.ip,
    }));
}

async function obtenerEventoPorSolicitud(solicitudId) {
    const meses = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const resultados = [];
    for (const mes of meses) {
        const rs = await client.execute(
            'SELECT * FROM eventos_auditoria WHERE mes = ?',
            [mes],
            { prepare: true }
        );
        for (const row of rs.rows) {
            if (row.metadata && row.metadata.includes(solicitudId)) {
                resultados.push(row);
            }
        }
    }
    return resultados;
}

module.exports = { registrarEvento, consultarEventos, obtenerEventoPorSolicitud };
