const { client } = require('../config/cassandra');

const UPSERT_RESUMEN = `
    UPDATE resumen_eventos SET total = total + 1
    WHERE tipo_evento = ? AND fecha = ?
`;

const QUERY_RESUMEN = `
    SELECT * FROM resumen_eventos
    WHERE tipo_evento = ? AND fecha = ?
`;

async function actualizarResumen(tipo_evento, fecha) {
    await client.execute(UPSERT_RESUMEN, [
        tipo_evento, fecha
    ], { prepare: true });
}

async function consultarResumenes({ tipo_evento, fecha }) {
    if (tipo_evento && fecha) {
        const rs = await client.execute(QUERY_RESUMEN, [tipo_evento, fecha], { prepare: true });
        return rs.rows.map(formatResumen);
    }
    if (tipo_evento) {
        const tipos = [tipo_evento];
        const resultados = [];
        for (const tipo of tipos) {
            const rs = await client.execute(QUERY_RESUMEN, [tipo, fecha], { prepare: true });
            resultados.push(...rs.rows.map(formatResumen));
        }
        return resultados;
    }
    const tipos = ['login_exitoso','login_fallido','solicitud_compra','compra_aceptada',
                   'compra_rechazada','compra_cancelada','modificacion_obra',
                   'modificacion_artista','cambio_rol','error_sistema'];
    const resultados = [];
    for (const tipo of tipos) {
        const rs = await client.execute(QUERY_RESUMEN, [tipo, fecha], { prepare: true });
        resultados.push(...rs.rows.map(formatResumen));
    }
    return resultados;
}

function formatResumen(row) {
    return {
        tipo_evento: row.tipo_evento,
        fecha: row.fecha,
        total: row.total ? row.total.toString() : '0',
    };
}

module.exports = { actualizarResumen, consultarResumenes };
