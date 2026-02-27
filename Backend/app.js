const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas Tablas artistas
{
    // Artistas
    app.use('/api/artistas', require('./routes/Artista/artistas'));

    // Nacionalidad
    app.use('/api/nacionalidad', require('./routes/Artista/nacionalidad'));
}

// Rutas Tablas Ceramica
{
    // Arcilla
    app.use('/api/arcilla', require('./routes/Ceramica/arcilla'));

    // Coccion
    app.use('/api/coccion', require('./routes/Ceramica/coccion'));

    // Esmaltado
    app.use('/api/esmaltado', require('./routes/Ceramica/esmaltado'));

    // Modelado
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


// Ruta de prueba
app.get('/', (req, res) => {
    res.send('El servidor funciona');
});

// Iniciar servidor
async function startServer() {
    // Espera a probar la conexion
    await testConnection(); 
    app.listen(port, () => {
        console.log(`Servidor en http://localhost:${port}`);
    });
}

startServer();