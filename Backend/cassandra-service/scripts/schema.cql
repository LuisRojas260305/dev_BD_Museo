CREATE KEYSPACE IF NOT EXISTS museo_auditoria
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE museo_auditoria;

CREATE TABLE IF NOT EXISTS eventos_auditoria (
    mes         TEXT,
    timestamp   TIMESTAMP,
    id          TIMEUUID,
    tipo_evento TEXT,
    usuario     TEXT,
    severidad   TEXT,
    metadata    TEXT,
    ip          TEXT,
    PRIMARY KEY ((mes), timestamp, id)
) WITH CLUSTERING ORDER BY (timestamp DESC, id DESC);

CREATE TABLE IF NOT EXISTS resumen_eventos (
    tipo_evento TEXT,
    fecha       DATE,
    total       COUNTER,
    PRIMARY KEY ((tipo_evento), fecha)
) WITH CLUSTERING ORDER BY (fecha DESC);
