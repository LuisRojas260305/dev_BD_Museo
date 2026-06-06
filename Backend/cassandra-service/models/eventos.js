const cassandra = require('cassandra-driver');
const store = require('./eventStore');
let client;

// Intento de conexión a Cassandra
try {
  client = require('../config/cassandra').client;
} catch {
  client = null;
}

let cassandraDisponible = null; // null = no verificado aún, boolean después

async function isCassandraAvailable() {
  if (cassandraDisponible !== null) return cassandraDisponible;
  if (!client) {
    cassandraDisponible = false;
    return false;
  }
  try {
    await client.execute('SELECT release_version FROM system.local');
    cassandraDisponible = true;
  } catch {
    cassandraDisponible = false;
  }
  return cassandraDisponible;
}

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
    if (await isCassandraAvailable()) {
        try {
            const ahora = new Date();
            const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
            const id = cassandra.types.TimeUuid.now();
            const metaStr = metadata ? JSON.stringify(metadata) : '{}';

            await client.execute(INSERT_EVENTO, [
                mes, ahora, id, tipo_evento, usuario, severidad, metaStr, ip || null
            ], { prepare: true });

            return { id: id.toString(), timestamp: ahora };
        } catch (err) {
            console.warn('Cassandra write failed, using file fallback:', err.message);
            cassandraDisponible = false;
        }
    }

    // Fallback a archivo
    return store.registrarEvento({ tipo_evento, usuario, severidad, metadata, ip });
}

async function consultarEventos({ tipo_evento, desde, hasta, limite = 100 }) {
    if (await isCassandraAvailable()) {
        try {
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
                metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
                ip: row.ip,
            }));
        } catch (err) {
            console.warn('Cassandra read failed, using file fallback:', err.message);
            cassandraDisponible = false;
        }
    }

    // Fallback a archivo
    return store.consultarEventos({ tipo_evento, desde, hasta, limite });
}

async function obtenerEventoPorSolicitud(solicitudId) {
    if (await isCassandraAvailable()) {
        try {
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
                    const meta = typeof row.metadata === 'string' ? row.metadata : JSON.stringify(row.metadata);
                    if (meta && meta.includes(solicitudId)) {
                        resultados.push(row);
                    }
                }
            }
            return resultados;
        } catch {
            // Fallback al store de archivo
        }
    }

    // Fallback: buscar en el store local
    return store.consultarEventos({ limite: 500 })
        .filter(e => {
            const meta = typeof e.metadata === 'string' ? e.metadata : JSON.stringify(e.metadata);
            return meta && meta.includes(solicitudId);
        });
}

module.exports = { registrarEvento, consultarEventos, obtenerEventoPorSolicitud };
