/**
 * Modelo de eventos de auditoría.
 * Proporciona acceso a la tabla `eventos_auditoria` en Cassandra con
 * particionamiento por mes, consultas por rango de fechas y búsqueda
 * de eventos asociados a una solicitud.
 */
const { client } = require('../config/cassandra');
const cassandra = require('cassandra-driver');

const TIPOS_LOGIN   = ['login_exitoso', 'login_fallido'];
const TIPOS_COMPRA  = ['solicitud_compra', 'reserva_creada', 'compra_aceptada', 'compra_rechazada', 'reserva_cancelada'];
const TIPOS_ADMIN   = ['cambio_rol', 'crear_usuario', 'eliminar_usuario', 'modificar_obra', 'eliminar_obra'];

function tablaParaTipo(tipo_evento) {
    if (TIPOS_LOGIN.includes(tipo_evento))  return 'eventos_login';
    if (TIPOS_COMPRA.includes(tipo_evento)) return 'eventos_compra';
    if (TIPOS_ADMIN.includes(tipo_evento))  return 'eventos_admin';
    return 'eventos_sistema';
}

const TODAS_TABLAS = ['eventos_login', 'eventos_compra', 'eventos_admin', 'eventos_sistema'];

function insertQuery(tabla) {
    return `INSERT INTO ${tabla} (mes, timestamp, id, tipo_evento, usuario, severidad, metadata, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
}

function selectQuery(tabla, conDesde) {
    return conDesde
        ? `SELECT * FROM ${tabla} WHERE mes = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?`
        : `SELECT * FROM ${tabla} WHERE mes = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT ?`;
}

function* mesesEntre(desde, hasta) {
    let d = new Date(desde);
    const h = new Date(hasta);
    while (d <= h) {
        const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        yield mes;
        d.setMonth(d.getMonth() + 1);
    }
}

/**
 * Registra un nuevo evento de auditoría en Cassandra.
 * Genera un TimeUuid como identificador y almacena metadata como JSON string.
 * @param {{ tipo_evento: string, usuario: string, severidad: string, metadata?: object, ip?: string }} params
 * @returns {Promise<{ id: string, timestamp: Date }>}
 */
async function registrarEvento({ tipo_evento, usuario, severidad, metadata, ip }) {
    const ahora = new Date();
    const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const id = cassandra.types.TimeUuid.now();
    const metaStr = metadata ? JSON.stringify(metadata) : '{}';
    const tabla = tablaParaTipo(tipo_evento);

    await client.execute(insertQuery(tabla), [
        mes, ahora, id, tipo_evento, usuario, severidad, metaStr, ip || null
    ], { prepare: true });

    return { id: id.toString(), timestamp: ahora };
}

/**
 * Consulta eventos en un rango de fechas, iterando por particiones mensuales.
 * @param {{ tipo_evento?: string, desde?: string, hasta?: string, limite?: number }} params
 * @returns {Promise<Array<{ id: string, timestamp: Date, mes: string, tipo_evento: string, usuario: string, severidad: string, metadata: object, ip: string|null }>>}
 */
async function consultarEventos({ tipo_evento, desde, hasta, limite = 100 }) {
    const inicio = desde ? new Date(desde) : new Date('2000-01-01');
    const fin = hasta ? new Date(hasta) : new Date();
    const max = Math.min(limite, 1000);

    const tablas = tipo_evento ? [tablaParaTipo(tipo_evento)] : TODAS_TABLAS;
    const resultados = [];

    for (const tabla of tablas) {
        for (const mes of mesesEntre(inicio, fin)) {
            const params = desde
                ? [mes, inicio, fin, max]
                : [mes, fin, max];
            const rs = await client.execute(selectQuery(tabla, !!desde), params, { prepare: true });
            resultados.push(...rs.rows);
            if (resultados.length >= max * tablas.length) break;
        }
    }

    resultados.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return resultados.slice(0, max).map(row => ({
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

/**
 * Busca eventos cuyo metadata contenga un ID de solicitud (búsqueda lineal sobre los últimos 3 meses).
 * Útil para correlacionar eventos con una solicitud de compra.
 * @param {string} solicitudId
 * @returns {Promise<Array>}
 */
async function obtenerEventoPorSolicitud(solicitudId) {
    const meses = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const resultados = [];
    for (const tabla of TODAS_TABLAS) {
        for (const mes of meses) {
            const rs = await client.execute(
                `SELECT * FROM ${tabla} WHERE mes = ?`,
                [mes],
                { prepare: true }
            );
            for (const row of rs.rows) {
                if (row.metadata && row.metadata.includes(solicitudId)) {
                    resultados.push(row);
                }
            }
        }
    }
    return resultados;
}

module.exports = { registrarEvento, consultarEventos, obtenerEventoPorSolicitud };
