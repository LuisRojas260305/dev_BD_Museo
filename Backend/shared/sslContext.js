/**
 * SSL - Session Context Layer.
 * Contexto de navegación que persiste durante la visita del usuario.
 * Reemplaza el uso de sesiones tradicionales en vistas de catálogo.
 * Almacenamiento en memoria con TTL configurable.
 */
const { v4: uuidv4 } = require('uuid');

const DEFAULT_TTL = 3600; // 1 hora en segundos
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

const contextos = new Map();

/**
 * Crea un nuevo contexto SSL con un ID único y TTL configurable.
 * @param {number} [ttl=3600] - Tiempo de vida en segundos
 * @returns {{ssl_id: string, creado_en: string, ultima_actividad: string, vistas: Array, ttl: number}}
 */
const createContext = (ttl = DEFAULT_TTL) => {
    const ssl = {
        ssl_id: uuidv4(),
        creado_en: new Date().toISOString(),
        ultima_actividad: new Date().toISOString(),
        vistas: [],
        ttl,
    };
    contextos.set(ssl.ssl_id, { ...ssl, _expira: Date.now() + ttl * 1000 });
    return ssl;
};

/**
 * Obtiene un contexto SSL por su ID si no ha expirado.
 * @param {string} ssl_id - ID del contexto
 * @returns {Object|null} Contexto SSL o null si no existe o expiró
 */
const getContext = (ssl_id) => {
    const ctx = contextos.get(ssl_id);
    if (!ctx) return null;
    if (Date.now() > ctx._expira) {
        contextos.delete(ssl_id);
        return null;
    }
    const { _expira, ...ssl } = ctx;
    return ssl;
};

/**
 * Agrega una vista de obra al contexto SSL y renueva su TTL.
 * @param {string} ssl_id - ID del contexto
 * @param {string} obra_id - ID de la obra visitada
 * @param {string} [tipo_vista='detalle'] - Tipo de vista
 * @returns {Object|null} Contexto actualizado o null si no existe o expiró
 */
const addView = (ssl_id, obra_id, tipo_vista = 'detalle') => {
    const ctx = contextos.get(ssl_id);
    if (!ctx) return null;
    if (Date.now() > ctx._expira) {
        contextos.delete(ssl_id);
        return null;
    }
    ctx.vistas.push({ obra_id, timestamp: new Date().toISOString(), tipo_vista });
    ctx.ultima_actividad = new Date().toISOString();
    ctx._expira = Date.now() + ctx.ttl * 1000; // renovar TTL
    const { _expira, ...ssl } = ctx;
    return ssl;
};

/**
 * Verifica si un contexto SSL ha expirado.
 * @param {string} ssl_id - ID del contexto
 * @returns {boolean} true si expiró o no existe
 */
const expiro = (ssl_id) => {
    const ctx = contextos.get(ssl_id);
    if (!ctx) return true;
    return Date.now() > ctx._expira;
};

// Cleanup periódico de contextos expirados
setInterval(() => {
    const ahora = Date.now();
    for (const [id, ctx] of contextos) {
        if (ahora > ctx._expira) contextos.delete(id);
    }
}, CLEANUP_INTERVAL);

module.exports = { createContext, getContext, addView, expiro };
