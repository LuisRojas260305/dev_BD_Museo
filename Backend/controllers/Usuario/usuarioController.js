const { pool } = require('../../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Registro de nuevo usuario (tipo 'usuario')
const registro = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { email, password, nombre, apellido, comentario } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son obligatorios' });
    }

    // Verificar email único
    const [exist] = await connection.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
    if (exist.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar usuario
    const [result] = await connection.query(
      `INSERT INTO Usuario (email, password, nombre, apellido, tipo, comentario) 
      VALUES (?, ?, ?, ?, 'usuario', ?)`,
      [email, hashedPassword, nombre, apellido || null, comentario || null]
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Usuario registrado correctamente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Registro de nuevo usuario (tipo 'admin')
const registroadmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { email, password, nombre, apellido, comentario } = req.body;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son obligatorios' });
    }

    // Verificar email único
    const [exist] = await connection.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
    if (exist.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hashear password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar usuario
    const [result] = await connection.query(
      `INSERT INTO Usuario (email, password, nombre, apellido, tipo, comentario) 
      VALUES (?, ?, ?, ?, 'administrador', ?)`,
      [email, hashedPassword, nombre, apellido || null, comentario || null]
    );

    await connection.commit();
    res.status(201).json({ id: result.insertId, message: 'Administrador registrado correctamente' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query('SELECT * FROM Usuario WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const usuario = rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Crear token
    const token = jwt.sign(
      { usuario_id: usuario.usuario_id, email: usuario.email, tipo: usuario.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, usuario: { id: usuario.usuario_id, email: usuario.email, nombre: usuario.nombre, tipo: usuario.tipo } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener perfil del usuario autenticado
const perfil = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.usuario_id, u.email, u.nombre, u.apellido, u.tipo, u.fecha_registro, u.comentario,
              m.tarjeta_numero, m.tarjeta_nombre, m.tarjeta_expiracion, m.codigo_seguridad
       FROM Usuario u
       LEFT JOIN Miembro m ON u.usuario_id = m.usuario_id
       WHERE u.usuario_id = ?`,
      [req.usuario.usuario_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Pago de membresía (usuario registrado se convierte en miembro)
const pagarMembresia = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { tarjeta_numero, tarjeta_nombre, tarjeta_expiracion } = req.body;
    const usuario_id = req.usuario.usuario_id;

    // Verificar que el usuario existe y no es ya miembro
    const [usuario] = await connection.query('SELECT tipo FROM Usuario WHERE usuario_id = ?', [usuario_id]);
    if (usuario.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (usuario[0].tipo === 'miembro') {
      return res.status(400).json({ error: 'El usuario ya es miembro' });
    }

    // Generar código de seguridad aleatorio
    const codigo = Math.random().toString(36).substring(2, 12).toUpperCase();

    // Insertar en Miembro
    await connection.query(
      `INSERT INTO Miembro (usuario_id, tarjeta_numero, tarjeta_nombre, tarjeta_expiracion, codigo_seguridad)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, tarjeta_numero, tarjeta_nombre, tarjeta_expiracion, codigo]
    );

    // Registrar el pago en Membresia
    await connection.query(
      `INSERT INTO Membresia (usuario_id, monto, codigo_generado) VALUES (?, 10.00, ?)`,
      [usuario_id, codigo]
    );

    // Actualizar tipo de usuario a 'miembro'
    await connection.query('UPDATE Usuario SET tipo = "miembro" WHERE usuario_id = ?', [usuario_id]);

    // Aquí podrías enviar el código por email (simulado)
    console.log(`Código de seguridad para usuario ${usuario_id}: ${codigo}`);

    await connection.commit();
    res.json({ message: 'Membresía activada', codigo_seguridad: codigo });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

const guardarRespuestasSeguridad = async (req, res) => {
  try {
    const { respuestas } = req.body; 
    const usuario_id = req.usuario.id; // ¡Importante! Viene del middleware verificarToken

    if (!respuestas || respuestas.length < 3) {
      return res.status(400).json({ error: 'Debes responder 3 preguntas' });
    }

    // Insertar cada respuesta
    for (const r of respuestas) {
      await pool.query(
        'INSERT INTO RespuestaSeguridad (usuario_id, pregunta_id, respuesta) VALUES (?, ?, ?)',
        [usuario_id, r.pregunta_id, r.respuesta]
      );
    }

    // Opcional: Actualizar el tipo de usuario a 'miembro' si no se hizo en el pago
    await pool.query("UPDATE Usuario SET tipo = 'miembro' WHERE usuario_id = ?", [usuario_id]);

    res.json({ message: 'Preguntas guardadas con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Recuperar código de seguridad (respondiendo preguntas)
const recuperarCodigo = async (req, res) => {
  try {
    const { email, respuestas } = req.body; // respuestas: array de { pregunta_id, respuesta }

    // Buscar usuario
    const [usuario] = await pool.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
    if (usuario.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario_id = usuario[0].usuario_id;

    // Verificar que sea miembro (tiene código)
    const [miembro] = await pool.query('SELECT codigo_seguridad FROM Miembro WHERE usuario_id = ?', [usuario_id]);
    if (miembro.length === 0) return res.status(404).json({ error: 'El usuario no es miembro' });

    // Verificar respuestas (asumiendo que el usuario tiene 3 preguntas registradas)
    // Necesitamos obtener las respuestas almacenadas y comparar
    for (const r of respuestas) {
      const [row] = await pool.query(
        'SELECT respuesta FROM RespuestaSeguridad WHERE usuario_id = ? AND pregunta_id = ?',
        [usuario_id, r.pregunta_id]
      );
      if (row.length === 0 || row[0].respuesta !== r.respuesta) {
        return res.status(401).json({ error: 'Respuesta incorrecta' });
      }
    }

    // Si todo ok, devolver el código (en un sistema real se enviaría por email)
    res.json({ codigo_seguridad: miembro[0].codigo_seguridad });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cambiar contraseña directamente en el perfil
const cambiarPasswordPerfil = async (req, res) => {
    try {
        const { nuevaPassword } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
        await pool.query('UPDATE Usuario SET password = ? WHERE usuario_id = ?', [hashedPassword, req.usuario.id]);
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
};

// Obtener las preguntas del usuario actual (Para el Perfil)
const obtenerMisPreguntas = async (req, res) => {
    try {
        const query = `
            SELECT p.pregunta_id, p.pregunta_texto 
            FROM RespuestaSeguridad rs
            JOIN PreguntaSeguridad p ON rs.pregunta_id = p.pregunta_id
            WHERE rs.usuario_id = ?`;
        const [preguntas] = await pool.query(query, [req.usuario.id]);
        res.json(preguntas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener preguntas' });
    }
};

// Regenerar Código de Seguridad (Validando preguntas)
const regenerarCodigoSeguridad = async (req, res) => {
    try {
        const { respuestas } = req.body;
        const usuario_id = req.usuario.id;

        for (const r of respuestas) {
            const [row] = await pool.query(
                'SELECT respuesta FROM RespuestaSeguridad WHERE usuario_id = ? AND pregunta_id = ?',
                [usuario_id, r.pregunta_id]
            );
            if (row.length === 0 || row[0].respuesta.toLowerCase() !== r.respuesta.toLowerCase()) {
                return res.status(401).json({ error: 'Respuestas incorrectas. No se generó el código.' });
            }
        }

        const nuevoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query('UPDATE Miembro SET codigo_seguridad = ? WHERE usuario_id = ?', [nuevoCodigo, usuario_id]);
        res.json({ message: 'Código regenerado', codigo_seguridad: nuevoCodigo });
    } catch (error) {
        res.status(500).json({ error: 'Error al regenerar código' });
    }
};

// Cambiar preguntas de seguridad
const actualizarPreguntasSeguridad = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { passwordActual, nuevasRespuestas } = req.body;
        const usuario_id = req.usuario.id;

        const [user] = await connection.query('SELECT password FROM Usuario WHERE usuario_id = ?', [usuario_id]);
        const valid = await bcrypt.compare(passwordActual, user[0].password);
        if (!valid) throw new Error('Contraseña actual incorrecta');

        await connection.query('DELETE FROM RespuestaSeguridad WHERE usuario_id = ?', [usuario_id]);

        for (const r of nuevasRespuestas) {
            await connection.query(
                'INSERT INTO RespuestaSeguridad (usuario_id, pregunta_id, respuesta) VALUES (?, ?, ?)',
                [usuario_id, r.pregunta_id, r.respuesta]
            );
        }

        await connection.commit();
        res.json({ message: 'Preguntas de seguridad actualizadas' });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// Obtener preguntas por Email (Para Recuperar Password externo)
const obtenerPreguntasUsuario = async (req, res) => {
    try {
        const { email } = req.params;
        const query = `
            SELECT p.pregunta_id, p.pregunta_texto 
            FROM RespuestaSeguridad rs
            JOIN PreguntaSeguridad p ON rs.pregunta_id = p.pregunta_id
            JOIN Usuario u ON rs.usuario_id = u.usuario_id
            WHERE u.email = ?`;
        const [preguntas] = await pool.query(query, [email]);
        if (preguntas.length === 0) return res.status(404).json({ error: 'Usuario no encontrado o sin preguntas configuradas' });
        res.json(preguntas);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
};

// Recuperar Password externo (Valida preguntas y cambia pass)
const recuperarPasswordExterno = async (req, res) => {
    try {
        const { email, respuestas, nuevaPassword } = req.body;
        const [usuarios] = await pool.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
        if (usuarios.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        const usuario_id = usuarios[0].usuario_id;

        for (const r of respuestas) {
            const [row] = await pool.query(
                'SELECT respuesta FROM RespuestaSeguridad WHERE usuario_id = ? AND pregunta_id = ?',
                [usuario_id, r.pregunta_id]
            );
            if (row.length === 0 || row[0].respuesta.toLowerCase() !== r.respuesta.toLowerCase()) {
                return res.status(401).json({ error: 'Una o más respuestas son incorrectas' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);
        await pool.query('UPDATE Usuario SET password = ? WHERE usuario_id = ?', [hashedPassword, usuario_id]);
        
        res.json({ message: 'Contraseña recuperada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al recuperar contraseña' });
    }
};

module.exports = {
  cambiarPasswordPerfil,
  obtenerMisPreguntas,
  regenerarCodigoSeguridad,
  actualizarPreguntasSeguridad,
  obtenerPreguntasUsuario,
  recuperarPasswordExterno,
  registro,
  registroadmin,
  login,
  perfil,
  pagarMembresia,
  recuperarCodigo,
  guardarRespuestasSeguridad
};