/**
 * Configuración y conexión a Cassandra.
 * Exporta el cliente configurado con pooling y consistencia LocalOne,
 * una función connect() para iniciar la conexión y getClient() para
 * obtener la instancia compartida.
 */
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'museo_auditoria',
    pooling: {
        coreConnectionsPerHost: {
            [cassandra.types.distanceLocal]: 2,
            [cassandra.types.distanceRemote]: 1,
        },
    },
    queryOptions: {
        consistency: cassandra.types.consistencies.localOne,
        prepare: true,
    },
});

/**
 * Inicia la conexión con el cluster Cassandra.
 * Imprime en consola el resultado de la operación.
 */
async function connect() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra');
    } catch (err) {
        console.error('Error conectando a Cassandra:', err.message);
    }
}

/** Devuelve la instancia compartida del cliente Cassandra. */
function getClient() { return client; }

module.exports = { client, connect, getClient };
