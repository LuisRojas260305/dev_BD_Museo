// Script de setup para desarrollo
// Crea: admin real, artistas con foto, obras con foto, épocas faltantes
// Ejecutar: node scripts/setup-dev.js (desde Backend/)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

// Genera un pequeño JPEG placeholder válido (1x1 píxel)
function generarPlaceholderJPEG(texto = 'IMG') {
    // JPEG minimalista de 1x1 pixel gris claro
    const jpeg = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21,
        0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x81, 0x14, 0x32,
        0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24,
        0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25,
        0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A,
        0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56,
        0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A,
        0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86,
        0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99,
        0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3,
        0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6,
        0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9,
        0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1,
        0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00,
        0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
        0xD9
    ]);
    return jpeg;
}

async function setup() {
    const conn = await pool.getConnection();
    try {
        console.log('🔧 Iniciando setup de desarrollo...\n');

        // -- 1. Admin con contraseña real --
        console.log('📧 Creando admin: admin@museo.com / admin123');
        const hash = await bcrypt.hash('admin123', 10);

        // Eliminar admin existente (seed con hash falso)
        await conn.query('DELETE FROM Administrador WHERE usuario_id = 1');
        await conn.query('DELETE FROM Usuario WHERE usuario_id = 1');

        const [adminResult] = await conn.query(
            `INSERT INTO Usuario (email, password, nombre, apellido, tipo, comentario)
             VALUES (?, ?, ?, ?, 'administrador', 'Administrador del sistema')`,
            ['admin@museo.com', hash, 'Admin', 'Principal']
        );
        await conn.query('INSERT INTO Administrador (usuario_id) VALUES (?)', [adminResult.insertId]);
        console.log(`   ✅ Admin creado con ID ${adminResult.insertId}\n`);

        // -- 2. Artistas --
        const placeholderFoto = generarPlaceholderJPEG();

        const artistas = [
            { nombre: 'Leonardo', apellido: 'da Vinci', bio: 'Polímata renacentista italiano', nacion: 4, ganancia: 10 },
            { nombre: 'Frida', apellido: 'Kahlo', bio: 'Pintora mexicana icónica', nacion: 2, ganancia: 8 },
            { nombre: 'Pablo', apellido: 'Picasso', bio: 'Pintor y escultor español, co-fundador del cubismo', nacion: 1, ganancia: 12 },
            { nombre: 'Salvador', apellido: 'Dalí', bio: 'Pintor surrealista español', nacion: 1, ganancia: 9 },
            { nombre: 'Auguste', apellido: 'Rodin', bio: 'Escultor francés, padre de la escultura moderna', nacion: 3, ganancia: 7 },
            { nombre: 'Ansel', apellido: 'Adams', bio: 'Fotógrafo estadounidense de paisajes', nacion: 5, ganancia: 6 },
        ];

        const artistasInsertados = [];
        console.log('🎨 Creando artistas con fotos...');
        for (const a of artistas) {
            const [res] = await conn.query(
                `INSERT INTO Artista (nombre, apellido, biografia, fecha_nacimiento, nacionalidad_id, foto, porcentaje_ganancia)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [a.nombre, a.apellido, a.bio, '1900-01-01', a.nacion, placeholderFoto, a.ganancia]
            );
            artistasInsertados.push(res.insertId);
            console.log(`   ✅ ${a.nombre} ${a.apellido} (ID: ${res.insertId})`);
        }

        // Asignar géneros a artistas
        for (const [i, id] of artistasInsertados.entries()) {
            const generoId = (i % 5) + 1; // 1-5 cíclico
            await conn.query(
                'INSERT IGNORE INTO Artista_Genero (artista_id, genero_id) VALUES (?, ?)',
                [id, generoId]
            );
        }
        console.log('   ✅ Géneros asignados a artistas\n');

        // -- 3. Obras --
        console.log('🖼️  Creando obras con fotos...');
        const obras = [
            { nombre: 'La Gioconda', artista: 0, genero: 1, epoca: 1, precio: 850000, anio: 1506, estado: 'Disponible', soporte: 1 },
            { nombre: 'Las Dos Fridas', artista: 1, genero: 1, epoca: 3, precio: 450000, anio: 1939, estado: 'Disponible', soporte: 1 },
            { nombre: 'Guernica', artista: 2, genero: 1, epoca: 3, precio: 1200000, anio: 1937, estado: 'Disponible', soporte: 1 },
            { nombre: 'La Persistencia de la Memoria', artista: 3, genero: 1, epoca: 3, precio: 680000, anio: 1931, estado: 'Disponible', soporte: 1 },
            { nombre: 'El Pensador', artista: 4, genero: 2, epoca: 3, precio: 320000, anio: 1904, estado: 'Disponible', tipo_escultura: 1, peso: 150, profundidad: 100 },
            { nombre: 'El Beso', artista: 4, genero: 2, epoca: 3, precio: 410000, anio: 1889, estado: 'Disponible', tipo_escultura: 1, peso: 200, profundidad: 120 },
            { nombre: 'Amanecer en Yosemite', artista: 5, genero: 3, epoca: 3, precio: 95000, anio: 1950, estado: 'Disponible', camara: 1, impresion: 1, tecnica: 2, tiraje: 20, obturacion: '1/125', apertura: 'f/8', iso: 100, resolucion: '300dpi', fecha_captura: '1950-06-15' },
            { nombre: 'Naturaleza Muerta', artista: 0, genero: 1, epoca: 1, precio: 280000, anio: 1510, estado: 'Disponible', soporte: 2 },
            { nombre: 'Autorretrato con Collar', artista: 1, genero: 1, epoca: 3, precio: 520000, anio: 1933, estado: 'Disponible', soporte: 1 },
            { nombre: 'Mujer Llorando', artista: 2, genero: 1, epoca: 3, precio: 380000, anio: 1937, estado: 'Disponible', soporte: 1 },
        ];

        for (const obra of obras) {
            const artistaId = artistasInsertados[obra.artista];
            const codigo = `OB-${String(obra.artista + 1).padStart(2, '0')}-${String(obras.indexOf(obra) + 1).padStart(2, '0')}`;

            const [obraRes] = await conn.query(
                `INSERT INTO Obra (nombre, codigo_inventario, artista_id, genero_id, epoca_id, precio_venta, alto, ancho, fecha_creacion, estado, foto, descripcion)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    obra.nombre, codigo, artistaId, obra.genero, obra.epoca,
                    obra.precio, 50, 40, `${obra.anio}-01-01`, obra.estado,
                    placeholderFoto, `${obra.nombre} - Obra de arte`
                ]
            );
            const obraId = obraRes.insertId;

            // Insertar datos específicos según género
            switch (obra.genero) {
                case 1: // Pintura
                    await conn.query(
                        'INSERT INTO Pintura (obra_id, soporte_id) VALUES (?, ?)',
                        [obraId, obra.soporte || 1]
                    );
                    break;
                case 2: // Escultura
                    await conn.query(
                        'INSERT INTO Escultura (obra_id, peso, profundidad, tipo_id) VALUES (?, ?, ?, ?)',
                        [obraId, obra.peso || 50, obra.profundidad || 50, obra.tipo_escultura || 1]
                    );
                    break;
                case 3: // Fotografía
                    await conn.query(
                        `INSERT INTO Fotografia (obra_id, tiraje, obturacion, apertura, iso, resolucion, fecha_captura, impresion_id, camara_id, tecnica_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [obraId, obra.tiraje || 1, obra.obturacion || '1/60', obra.apertura || 'f/5.6',
                         obra.iso || 200, obra.resolucion || '300dpi', obra.fecha_captura || '2000-01-01',
                         obra.impresion || 1, obra.camara || 1, obra.tecnica || 2]
                    );
                    break;
            }

            console.log(`   ✅ ${obra.nombre} (ID: ${obraId}) - $${obra.precio.toLocaleString()}`);
        }

        console.log('\n✅ Setup completado exitosamente!');
        console.log('   Admin: admin@museo.com / admin123');
        console.log(`   ${artistas.length} artistas, ${obras.length} obras creados`);

    } catch (err) {
        console.error('❌ Error:', err);
        await conn.rollback();
    } finally {
        conn.release();
        await pool.end();
    }
}

setup();
