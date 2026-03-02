const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection } = require('./config/database');

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

// Rutas Tablas artistas
{
    app.use('/api/artistas', require('./routes/Artista/artistas'));
    app.use('/api/nacionalidad', require('./routes/Artista/nacionalidad'));
}

// Rutas Tablas Ceramica
{
    app.use('/api/arcilla', require('./routes/Ceramica/arcilla'));
    app.use('/api/coccion', require('./routes/Ceramica/coccion'));
    app.use('/api/esmaltado', require('./routes/Ceramica/esmaltado'));
    app.use('/api/modelado', require('./routes/Ceramica/modelado'));
}

// Rutas Tablas Escultura
{
    app.use('/api/tipo_escultura', require('./routes/Escultura/tipo_escultura'));
    app.use('/api/material', require('./routes/Escultura/material'));
    app.use('/api/tecnica_escultura', require('./routes/Escultura/tecnica_escultura'));
}

// Rutas Tablas Fotografia
{
    app.use('/api/impresion', require('./routes/Fotografia/impresion'));
    app.use('/api/tecnica_fotografica', require('./routes/Fotografia/tecnica_fotografica'));
    app.use('/api/camara', require('./routes/Fotografia/camara'));
}

// Rutas Tablas Pinturas
{
    app.use('/api/soporte', require('./routes/Pintura/soporte'));
    app.use('/api/estilo', require('./routes/Pintura/estilo'));
    app.use('/api/tematica', require('./routes/Pintura/tematica'));
}

// Rutas Tablas Orfebreria
{
    app.use('/api/pieza_orfebreria', require('./routes/Orfebreria/pieza_orfebreria'));
    app.use('/api/metales', require('./routes/Orfebreria/metales'));
}

// Genero
app.use('/api/genero', require('./routes/Obra/genero'));

// Usuarios
app.use('/api/usuarios', require('./routes/Usuario/usuarios'));
app.use('/api/preguntas-seguridad', require('./routes/Usuario/preguntas'));

// Obras
app.use('/api/obras', require('./routes/Obra/obras'));
app.use('/api/epoca', require('./routes/Obra/epoca'));

// Ventas
app.use('/api/ventas', require('./routes/Compra/ventas'));
app.use('/api/upload', require('./routes/Compra/upload'));
app.use('/api/reportes', require('./routes/Compra/reportes'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('El servidor funciona');
});

// Manejador de errores (para capturar errores de Multer, etc.)
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el tamaño permitido (5 MB).' });
    }
    console.error(err.stack);
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