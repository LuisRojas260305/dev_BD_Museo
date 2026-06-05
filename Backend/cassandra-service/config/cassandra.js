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

async function connect() {
    try {
        await client.connect();
        console.log('Conectado a Cassandra');
    } catch (err) {
        console.error('Error conectando a Cassandra:', err.message);
    }
}

function getClient() { return client; }

module.exports = { client, connect, getClient };
