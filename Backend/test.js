const axios = require('axios');

const API = 'http://localhost:3000/api';
let tokenUsuario = null;
let tokenAdmin = null;
let idArtista = null;
let idObra = null;
let idVenta = null;

// Helper para peticiones autenticadas
const authRequest = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const logSuccess = (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const logError = (msg, err) => console.log(`${colors.red}❌ ${msg}: ${err.message}${colors.reset}`);
const logInfo = (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`);

async function runTests() {
  logInfo('Iniciando pruebas integrales del backend...\n');

  // 1. Crear usuario registrado
  try {
    const email = `test${Date.now()}@example.com`;
    const password = '123456';
    const nombre = 'Test User';

    logInfo('Registrando usuario...');
    const reg = await axios.post(`${API}/usuarios/registro`, {
      email, password, nombre, apellido: 'Apellido'
    });
    if (reg.status !== 201) throw new Error('Registro falló');
    logSuccess('Usuario registrado');

    // 2. Login como usuario registrado
    logInfo('Login como usuario registrado...');
    const login = await axios.post(`${API}/usuarios/login`, { email, password });
    if (login.status !== 200 || !login.data.token) throw new Error('Login falló');
    tokenUsuario = login.data.token;
    logSuccess('Login exitoso, token obtenido');

    // 3. Obtener perfil
    logInfo('Obteniendo perfil...');
    const perfil = await axios.get(`${API}/usuarios/perfil`, authRequest(tokenUsuario));
    if (perfil.status !== 200) throw new Error('Perfil no obtenido');
    logSuccess('Perfil obtenido');

    // 4. Pagar membresía (convertirse en miembro)
    // 4. Pagar membresía (convertirse en miembro)
    logInfo('Pagando membresía...');
    const membresia = await axios.post(`${API}/usuarios/membresia`, {
      tarjeta_numero: '4111111111111111',
      tarjeta_nombre: 'Test User',
      tarjeta_expiracion: '2028-12-31'
    }, authRequest(tokenUsuario));
    if (membresia.status !== 200) throw new Error('Pago de membresía falló');
    logSuccess('Membresía activada, código: ' + membresia.data.codigo_seguridad);

    // --- NUEVO: Re-login para obtener token con tipo 'miembro' ---
    logInfo('Re-logueando como miembro para actualizar token...');
    const loginMiembro = await axios.post(`${API}/usuarios/login`, {
      email: email,   // el mismo email usado al registrar
      password: password
    });
    tokenUsuario = loginMiembro.data.token;
    logSuccess('Token de miembro actualizado');

    // 5. Crear un administrador (necesitamos uno para las operaciones admin)
    // Nota: No hay endpoint público para crear admin, así que lo insertamos directamente en BD o usamos un admin preexistente.
    // Para pruebas, podemos usar un admin fijo (ej. email: admin@test.com, password: admin123) que insertamos manualmente.
    // Aquí asumimos que existe un admin con email 'admin@test.com' y password 'admin123'.
    logInfo('Login como administrador (debe existir previamente)...');
    try {
      const loginAdmin = await axios.post(`${API}/usuarios/login`, {
        email: 'admin@museo.com',
        password: 'admin123'
      });
      if (loginAdmin.status !== 200) throw new Error('Admin no configurado');
      tokenAdmin = loginAdmin.data.token;
      logSuccess('Login admin exitoso');
    } catch (e) {
      logError('No se pudo loguear admin. Debes crear un usuario administrador manualmente con email admin@test.com y password admin123', e);
      return;
    }

    // 6. Crear un artista (admin)
    logInfo('Creando artista (admin)...');
    const artistaData = {
      nombre: 'Artista Test',
      apellido: 'Apellido Test',
      biografia: 'Biografía de prueba',
      fecha_nacimiento: '1980-01-01',
      nacionalidad_id: 1, // Asume que existe nacionalidad con ID 1
      foto_url: 'test.jpg',
      porcentaje_ganancia: 7.5,
      comentario: 'Comentario',
      generos: [1, 2] // Asume géneros con IDs 1 y 2
    };
    const artista = await axios.post(`${API}/artistas`, artistaData, authRequest(tokenAdmin));
    if (artista.status !== 201) throw new Error('Creación de artista falló');
    idArtista = artista.data.id;
    logSuccess(`Artista creado con ID ${idArtista}`);

    // 7. Crear una obra (pintura) (admin)
    logInfo('Creando obra de pintura (admin)...');
    const obraData = {
      nombre: 'Obra Test',
      codigo_inventario: `PIN-${String(Date.now()).slice(-5)}`,
      artista_id: idArtista,
      genero_id: 1, // Pintura
      epoca_id: 1, // Asume época con ID 1
      precio_venta: 1000,
      alto: 100,
      ancho: 80,
      fecha_creacion: '2023-01-01',
      estado: 'Disponible',
      foto_url: 'obra.jpg',
      descripcion: 'Descripción',
      comentario: '',
      // Datos específicos de pintura
      soporte_id: 1,
      estilos: [1, 2],
      tematicas: [1]
    };
    const obra = await axios.post(`${API}/obras`, obraData, authRequest(tokenAdmin));
    if (obra.status !== 201) throw new Error('Creación de obra falló');
    idObra = obra.data.id;
    logSuccess(`Obra creada con ID ${idObra}`);

    // 8. Reservar obra (como miembro)
    logInfo('Reservando obra...');
    const reserva = await axios.post(`${API}/ventas/reservar`, {
      obra_id: idObra,
      codigo_seguridad: membresia.data.codigo_seguridad
    }, authRequest(tokenUsuario));
    if (reserva.status !== 200) throw new Error('Reserva falló');
    idVenta = reserva.data.venta_id;
    logSuccess(`Reserva creada, ID venta ${idVenta}`);

    // 9. Concretar venta (admin)
    logInfo('Concretando venta (admin)...');
    const concretar = await axios.put(`${API}/ventas/${idVenta}/concretar`, {
      direccion_envio: 'Calle Falsa 123'
    }, authRequest(tokenAdmin));
    if (concretar.status !== 200) throw new Error('Concretar venta falló');
    logSuccess('Venta concretada y factura generada');

    // 10. Consultar reportes (admin)
    logInfo('Consultando obras vendidas por período...');
    const hoy = new Date().toISOString().split('T')[0];
    const reporteVentas = await axios.get(`${API}/reportes/ventas?desde=2020-01-01&hasta=${hoy}`, authRequest(tokenAdmin));
    if (reporteVentas.status !== 200) throw new Error('Reporte de ventas falló');
    logSuccess(`Ventas encontradas: ${reporteVentas.data.length}`);

    logInfo('Consultando resumen de facturación...');
    const reporteFact = await axios.get(`${API}/reportes/facturacion?desde=2020-01-01&hasta=${hoy}`, authRequest(tokenAdmin));
    if (reporteFact.status !== 200) throw new Error('Reporte de facturación falló');
    logSuccess(`Facturas encontradas: ${reporteFact.data.length}`);

    logInfo('Consultando resumen de membresías...');
    const reporteMem = await axios.get(`${API}/reportes/membresias?desde=2020-01-01&hasta=${hoy}`, authRequest(tokenAdmin));
    if (reporteMem.status !== 200) throw new Error('Reporte de membresías falló');
    logSuccess(`Membresías encontradas: ${reporteMem.data.length}`);

    logSuccess('\n🎉 Todas las pruebas pasaron correctamente!');
  } catch (error) {
    logError('Error en prueba', error.response?.data || error);
    if (error.response) {
      console.log('Detalles:', error.response.data);
    }
  }
}

runTests();