// Importacion de los modulos
const mysql = require('mysql2/promise');
require('dotenv').config();

// Creacion de la pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Funcion para probar la conexcion
async function testConnection() {
    try{
        const connection = await pool.getConnection();
        console.log('Conexion exitosa');
        connection.release();
    } catch (error) {
        console.error("Error de conexion:", error);
    }
}

module.exports = { pool, testConnection };