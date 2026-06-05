const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { testConnection } = require('./config/database');
const { auditar } = require('./services/auditoriaHelper');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Aumentar límite para JSON (opcional, para otros endpoints)
app.use(express.json({ limit: '10mb' }));

// Usuarios
app.use('/api/usuarios', require('./routes/Usuario/usuarios'));
app.use('/api/preguntas-seguridad', require('./routes/Usuario/preguntas'));

// Catálogo público — proxy a mongodb-service (reemplaza a /api/obras para consultas)
app.use('/api/catalogo', require('./routes/catalogo.routes'));

// Multimedia — servir fotos desde MySQL
app.use('/api/multimedia', require('./routes/multimedia.routes'));

// Eventos — proxy a cassandra-service
app.use('/api/eventos', require('./routes/eventos.routes'));

// Ventas
app.use('/api/ventas', require('./routes/Compra/ventas'));
app.use('/api/upload', require('./routes/Compra/upload'));
app.use('/api/reportes', require('./routes/Compra/reportes'));

// Frontend estático — servir las páginas desde el mismo backend
const frontendPath = path.resolve(__dirname, '../Frontend/pages');
app.use(express.static(frontendPath));
app.use('/js', express.static(path.resolve(__dirname, '../Frontend/js')));

// Ruta de prueba
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Manejador de errores (para capturar errores de Multer, etc.)
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

// Iniciar servidor
async function startServer() {
    await testConnection();
    app.listen(port, () => {
        console.log(`Servidor en http://localhost:${port}`);
    });
}

startServer();