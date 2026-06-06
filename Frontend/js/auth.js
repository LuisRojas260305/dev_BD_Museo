/**
 * Módulo de autenticación para el Museo de Arte Contemporáneo.
 * Proporciona funciones para manejo de tokens JWT, sesión de usuario
 * y peticiones autenticadas a la API REST (backend Express).
 *
 * APIs utilizadas:
 * - POST /api/usuarios/login
 * - POST /api/usuarios/registro
 * - GET/POST /api/usuarios/perfil, membresia, seguridad, etc.
 * - GET /api/catalogo, /api/catalogo/generos, /api/catalogo/artistas
 * - POST /api/ventas/reservar
 * - GET /api/preguntas-seguridad
 */
const API_BASE = 'http://localhost:3000/api';

/**
 * Guarda el token JWT y los datos del usuario en localStorage.
 * @param {string} token - Token JWT devuelto por el servidor.
 * @param {Object} user - Objeto con datos del usuario (nombre, email, tipo, etc.).
 */
function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Recupera el token JWT almacenado en localStorage.
 * @returns {string|null} El token JWT o null si no hay sesión activa.
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Recupera el objeto de usuario almacenado en localStorage.
 * @returns {Object|null} Datos del usuario parseados, o null si no hay sesión.
 */
function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

/**
 * Verifica si hay una sesión activa (token presente).
 * @returns {boolean} True si el usuario está autenticado.
 */
function isLoggedIn() {
    return !!getToken();
}

/**
 * Cierra la sesión: elimina token y datos del usuario de localStorage
 * y redirige a la página de inicio.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

/**
 * Realiza una petición fetch autenticada. Agrega automáticamente el
 * header Authorization con el token JWT y el Content-Type adecuado.
 * Si el body es FormData, omite el Content-Type para que el navegador
 * lo establezca con el boundary correcto.
 *
 * @param {string} url - URL del endpoint a consumir.
 * @param {Object} [options={}] - Opciones de fetch (method, body, headers, etc.).
 * @returns {Promise<Response>} Respuesta del servidor.
 */
async function authFetch(url, options = {}) {
    const token = getToken();
    let headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    return response;
}
