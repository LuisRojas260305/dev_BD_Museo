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

CREATE TABLE IF NOT EXISTS eventos_login (
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

CREATE TABLE IF NOT EXISTS eventos_compra (
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

CREATE TABLE IF NOT EXISTS eventos_admin (
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

CREATE TABLE IF NOT EXISTS eventos_sistema (
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

-- Visitas por obra: permite desglose diario y top por período
CREATE TABLE IF NOT EXISTS visitas_obra (
    obra_id TEXT,
    fecha   DATE,
    total   COUNTER,
    PRIMARY KEY (obra_id, fecha)
) WITH CLUSTERING ORDER BY (fecha DESC);

-- Total acumulado de visitas por obra (para ranking rápido)
CREATE TABLE IF NOT EXISTS visitas_totales (
    obra_id     TEXT PRIMARY KEY,
    total       COUNTER
);
