/**
 * Controlador del microservicio de recomendaciones (Neo4j).
 * Expone recomendaciones basadas en el grafo y el registro de compras que
 * llega de forma asíncrona desde el core transaccional (SQL).
 */
const grafo = require('../models/grafo');
const nlToCypher = require('../services/nlToCypher');

/** GET /api/recomendaciones/:usuarioId - recomendaciones combinadas para un usuario. */
const recomendarUsuario = async (req, res, next) => {
    try {
        const usuarioId = parseInt(req.params.usuarioId, 10);
        if (!usuarioId) return res.status(400).json({ error: 'usuarioId inválido' });
        const limite = parseInt(req.query.limite, 10) || 12;
        const estrategia = req.query.estrategia || 'mix';

        let recomendaciones;
        let perfil;
        let tema;
        if (estrategia === 'artista') {
            recomendaciones = await grafo.recomendarPorArtista(usuarioId, limite);
        } else if (estrategia === 'colaborativo') {
            recomendaciones = await grafo.recomendarColaborativo(usuarioId, limite);
        } else if (estrategia === 'genero') {
            recomendaciones = await grafo.recomendarPorGenero(usuarioId, limite);
        } else {
            // variado: elige un tema coherente al azar (un género, un artista o
            // colaborativo) y devuelve obras de ese tema, barajadas.
            [{ tema, recomendaciones }, perfil] = await Promise.all([
                grafo.recomendarVariado(usuarioId, limite),
                grafo.perfilComprador(usuarioId),
            ]);
        }

        res.json({ usuario_id: usuarioId, estrategia, tema, total: recomendaciones.length, perfil, recomendaciones });
    } catch (err) { next(err); }
};

/** GET /api/recomendaciones/:usuarioId/genero */
const porGenero = async (req, res, next) => {
    try {
        const usuarioId = parseInt(req.params.usuarioId, 10);
        const limite = parseInt(req.query.limite, 10) || 10;
        res.json({ recomendaciones: await grafo.recomendarPorGenero(usuarioId, limite) });
    } catch (err) { next(err); }
};

/** GET /api/recomendaciones/:usuarioId/artista */
const porArtista = async (req, res, next) => {
    try {
        const usuarioId = parseInt(req.params.usuarioId, 10);
        const limite = parseInt(req.query.limite, 10) || 10;
        res.json({ recomendaciones: await grafo.recomendarPorArtista(usuarioId, limite) });
    } catch (err) { next(err); }
};

/** GET /api/recomendaciones/populares */
const populares = async (req, res, next) => {
    try {
        const limite = parseInt(req.query.limite, 10) || 10;
        res.json({ obras: await grafo.obrasPopulares(limite) });
    } catch (err) { next(err); }
};

/**
 * POST /api/recomendaciones/compras - registra una compra en el grafo.
 * Lo invoca el core (SQL) de forma asíncrona tras concretar una venta.
 */
const registrarCompra = async (req, res, next) => {
    try {
        const { usuario_id, obra_id } = req.body;
        if (!usuario_id || !obra_id) {
            return res.status(400).json({ error: 'usuario_id y obra_id son obligatorios' });
        }
        const resultado = await grafo.registrarCompra(req.body);
        res.status(201).json({ ok: true, ...resultado });
    } catch (err) { next(err); }
};

/**
 * POST /api/recomendaciones/nl - Reto +5%: traduce lenguaje natural a Cypher
 * y (opcionalmente) lo ejecuta. Body: { pregunta, usuario_id?, ejecutar? }.
 */
const lenguajeNatural = async (req, res, next) => {
    try {
        const { pregunta, usuario_id, ejecutar = true } = req.body;
        if (!pregunta || !pregunta.trim()) {
            return res.status(400).json({ error: 'Falta la pregunta' });
        }
        const traduccion = await nlToCypher.traducir(pregunta, { usuario_id });
        if (!traduccion) {
            return res.status(422).json({
                error: 'No entendí la pregunta',
                sugerencias: [
                    'Muéstrame obras del mismo género que compré',
                    'Recomiéndame obras del mismo artista que compré',
                    'Pinturas disponibles de menos de 50000',
                    '¿Cuáles son las obras más compradas?',
                    'Obras de Picasso',
                ],
            });
        }

        let resultados;
        if (ejecutar) {
            resultados = await grafo.consultaLibre(traduccion.cypher, traduccion.params);
        }
        res.json({ pregunta, ...traduccion, total: resultados ? resultados.length : undefined, resultados });
    } catch (err) { next(err); }
};

/** Health check público. */
const healthCheck = async (req, res) => {
    try {
        const stats = await grafo.estadisticas();
        res.json({ status: 'ok', service: 'neo4j-recomendaciones', grafo: stats });
    } catch (err) {
        res.status(503).json({ status: 'degraded', error: err.message });
    }
};

module.exports = {
    recomendarUsuario, porGenero, porArtista, populares,
    registrarCompra, lenguajeNatural, healthCheck,
};
