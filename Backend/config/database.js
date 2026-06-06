/**
 * Configuración y pool de conexiones a MySQL.
 * Provee una pool reutilizable con hasta 10 conexiones simultáneas
 * y una función de verificación de conectividad.
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/**
 * Prueba la conexión a la base de datos obteniendo y liberando una conexión.
 * @returns {Promise<void>}
 */
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
