/**
 * Archivo principal de entrada del backend del Museo.
 * Configura Express con CORS, middlewares, enrutamiento y manejo global de errores.
 * Inicia el servidor tras verificar la conexión a la base de datos.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { testConnection } = require('./config/database');
const { auditar } = require('./services/auditoriaHelper');

const app = express();
const port = process.env.PORT || 3000;

// CORS - permitir todos los orígenes (desarrollo)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Parse JSON con límite ampliado
app.use(express.json({ limit: '10mb' }));

// Usuarios
app.use('/api/usuarios', require('./routes/Usuario/usuarios'));
app.use('/api/preguntas-seguridad', require('./routes/Usuario/preguntas'));

// Catálogo público - proxy a mongodb-service
app.use('/api/catalogo', require('./routes/catalogo.routes'));

// Multimedia - servir fotos desde MySQL
app.use('/api/multimedia', require('./routes/multimedia.routes'));

// Eventos - proxy a cassandra-service
app.use('/api/eventos', require('./routes/eventos.routes'));

// Reseñas de obras
app.use('/api/resenas', require('./routes/resenas.routes'));

// Visitas a obras (contador en Cassandra)
app.use('/api/visitas', require('./routes/visitas.routes'));

// Recomendaciones - proxy a neo4j-service (grafo de conocimiento)
app.use('/api/recomendaciones', require('./routes/recomendaciones.routes'));

// Ventas
app.use('/api/ventas', require('./routes/Compra/ventas'));
app.use('/api/upload', require('./routes/Compra/upload'));
app.use('/api/reportes', require('./routes/Compra/reportes'));

// Frontend estático
const frontendPath = path.resolve(__dirname, '../Frontend/pages');
app.use(express.static(frontendPath));
app.use('/js',  express.static(path.resolve(__dirname, '../Frontend/js')));
app.use('/css', express.static(path.resolve(__dirname, '../Frontend/css')));
app.use('/img', express.static(path.resolve(__dirname, '../Frontend/img')));

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Manejador global de errores
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el tamaño permitido (5 MB).' });
    }
    console.error(err.stack);
    auditar('error_sistema', 'sistema', 'critical', {
        endpoint: req.originalUrl || req.url,
        metodo: req.method,
        codigo_error: err.message?.substring(0, 200)
    });
    res.status(500).json({ error: err.message });
});

/**
 * Inicia el servidor Express luego de verificar la conexión a la base de datos.
 * @returns {Promise<void>}
 */
async function startServer() {
    await testConnection();
    app.listen(port, () => {
        console.log(`Servidor en http://localhost:${port}`);
    });
}

startServer();
