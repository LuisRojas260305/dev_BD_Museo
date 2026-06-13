// ===========================================================================
//  Esquema del grafo - Museo de Arte Contemporáneo (Sprint 3 - Neo4j)
//
//  Topología (Query-Driven para recomendaciones):
//    (Comprador)-[:COMPRÓ]->(Obra)<-[:CREÓ]-(Artista)-[:TRABAJA_EN]->(Genero)
//    (Obra)-[:PERTENECE_A]->(Genero)   // arista directa para recomendación precisa
//
//  Constraints de unicidad => sirven como "clave primaria" de cada nodo y
//  habilitan índices que aceleran los MERGE del seed y de cada compra en vivo.
// ===========================================================================

CREATE CONSTRAINT comprador_id IF NOT EXISTS
FOR (c:Comprador) REQUIRE c.usuario_id IS UNIQUE;

CREATE CONSTRAINT obra_id IF NOT EXISTS
FOR (o:Obra) REQUIRE o.obra_id IS UNIQUE;

CREATE CONSTRAINT artista_id IF NOT EXISTS
FOR (a:Artista) REQUIRE a.artista_id IS UNIQUE;

CREATE CONSTRAINT genero_nombre IF NOT EXISTS
FOR (g:Genero) REQUIRE g.nombre IS UNIQUE;

// Índices secundarios para filtros frecuentes en recomendaciones
CREATE INDEX obra_estado IF NOT EXISTS FOR (o:Obra) ON (o.estado);
CREATE INDEX obra_genero IF NOT EXISTS FOR (o:Obra) ON (o.genero);
