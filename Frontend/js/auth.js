const API_BASE = 'http://localhost:3000/api';
const MONGODB_URL = 'http://localhost:3001';

let mongodbAvailable = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 300000;

function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function isLoggedIn() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

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

async function isMongoDBAvailable() {
    const now = Date.now();
    if (now - lastHealthCheck < HEALTH_CACHE_TTL && mongodbAvailable !== null) {
        return mongodbAvailable;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${MONGODB_URL}/api/catalog/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        mongodbAvailable = res.ok;
    } catch {
        mongodbAvailable = false;
    }

    lastHealthCheck = now;
    return mongodbAvailable;
}

function getCatalogBaseURL() {
    return mongodbAvailable ? MONGODB_URL : API_BASE;
}