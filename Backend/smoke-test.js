#!/usr/bin/env node
/**
 * Smoke Test — Verifica que todo el sistema funcione end-to-end.
 *
 * Prerequisitos:
 *   - MySQL en 3306 (con test_bodega_museo + seed data)
 *   - MongoDB en 27017 (con museo_catalogo + seed data)
 *   - Express en 3000
 *   - mongodb-service en 3001
 *
 * Uso: node smoke-test.js
 *   Exit 0 = todo OK
 *   Exit 1 = falló algún test
 */

const axios = require('axios');
const assert = require('assert');

const API = 'http://localhost:3000/api';
const CATALOG_API = 'http://localhost:3001/api/catalog';

let passed = 0;
let failed = 0;
let adminToken = null;
let userToken = null;
let createdObraId = null;
let createdGeneroId = null;
let createdArtistaId = null;
let obraDetailId = null;
let ventaId = null;
let codigoSeguridad = null;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (err) {
      failed++;
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.log(`  ❌ ${name}: ${msg}`);
    }
  };
}

function assertOk(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertStatusCode(expected) {
  return (res) => {
    assertOk(res.status === expected, `Expected status ${expected}, got ${res.status}`);
    return res;
  };
}

async function run() {
  console.log('\n🚀 SMOKE TEST — Museo BD Architecture\n');
  console.log(`Target: ${API}\n`);

  // =========================================================================
  // 1. Health check — mongodb-service
  // =========================================================================
  await test('1. Health check — mongodb-service', async () => {
    const res = await axios.get(`${CATALOG_API}/health`);
    assertStatusCode(200)(res);
    assertOk(res.data.status === 'ok', `Expected 'ok', got '${res.data.status}'`);
    assertOk(res.data.mongodb === 'connected', `Expected 'connected', got '${res.data.mongodb}'`);
  })();

  // =========================================================================
  // 2. Catalog public — GET /api/catalogo (list with pagination)
  // =========================================================================
  await test('2. Catalog public — GET /api/catalogo', async () => {
    const res = await axios.get(`${API}/catalogo`);
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(Array.isArray(res.data.data), 'data should be an array');
    assertOk(res.data.total >= 15, `Expected >=15 obras, got ${res.data.total}`);
    assertOk(res.data.page === 1, `Expected page 1, got ${res.data.page}`);
    assertOk(res.data.limit === 10, `Expected limit 10, got ${res.data.limit}`);
    // Save first obra ID for detail test
    if (res.data.data.length > 0) {
      obraDetailId = res.data.data[0].obra_id || res.data.data[0]._id;
    }
  })();

  // =========================================================================
  // 3. Catalog search — GET /api/catalogo/search?q=Gioconda
  // =========================================================================
  await test('3. Catalog search — GET /api/catalogo/search?q=Gioconda', async () => {
    const res = await axios.get(`${API}/catalogo/search`, { params: { q: 'Gioconda' } });
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(Array.isArray(res.data.data), 'data should be an array');
    assertOk(res.data.data.length > 0, `Expected results, got ${res.data.data.length}`);
  })();

  // =========================================================================
  // 4. Generos public — GET /api/catalogo/generos
  // =========================================================================
  await test('4. Generos public — GET /api/catalogo/generos', async () => {
    const res = await axios.get(`${API}/catalogo/generos`);
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(Array.isArray(res.data.data), 'data should be an array');
    assertOk(res.data.data.length === 5, `Expected 5 generos, got ${res.data.data.length}`);
  })();

  // =========================================================================
  // 5. Artistas public — GET /api/catalogo/artistas
  // =========================================================================
  await test('5. Artistas public — GET /api/catalogo/artistas', async () => {
    const res = await axios.get(`${API}/catalogo/artistas`);
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(Array.isArray(res.data.data), 'data should be an array');
    assertOk(res.data.data.length === 8, `Expected 8 artistas, got ${res.data.data.length}`);
  })();

  // =========================================================================
  // 6. Login as admin — POST /api/usuarios/login
  // =========================================================================
  await test('6. Login as admin — POST /api/usuarios/login', async () => {
    const res = await axios.post(`${API}/usuarios/login`, {
      email: 'admin@museo.com',
      password: 'admin123',
    });
    assertStatusCode(200)(res);
    assertOk(res.data.token, 'Missing token');
    assertOk(res.data.usuario, 'Missing usuario');
    assertOk(res.data.usuario.tipo === 'administrador', `Expected admin, got ${res.data.usuario.tipo}`);
    adminToken = res.data.token;
  })();

  // =========================================================================
  // 7. Admin login test — verify token
  // =========================================================================
  await test('7. Verify admin token — GET /api/usuarios/perfil', async () => {
    const res = await axios.get(`${API}/usuarios/perfil`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.email === 'admin@museo.com', `Expected admin@museo.com, got ${res.data.email}`);
    assertOk(res.data.tipo === 'administrador', `Expected administrador, got ${res.data.tipo}`);
  })();

  // =========================================================================
  // 8. Create obra via admin — POST /api/catalogo/obras
  // =========================================================================
  await test('8. Create obra via admin — POST /api/catalogo/obras', async () => {
    const obraData = {
      codigo_inventario: 'SMOKE-001',
      nombre: 'Obra de Smoke Test',
      genero: 'Pintura',
      precio_venta: 99999.99,
      alto: 100,
      ancho: 80,
      fecha_creacion: '2024-01-01',
      estado: 'Disponible',
      descripcion: 'Obra creada durante smoke test',
      detalles: { soporte: 'Lienzo', estilos: ['Contemporáneo'], tematicas: ['Abstracto'] },
    };
    const res = await axios.post(`${API}/catalogo/obras`, obraData, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(201)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.data, 'Missing data');
    assertOk(res.data.data._id, 'Missing obra _id');
    createdObraId = res.data.data._id;
  })();

  // =========================================================================
  // 9. Update obra — PUT /api/catalogo/obras/:id
  // =========================================================================
  await test('9. Update obra — PUT /api/catalogo/obras/:id', async () => {
    const updateData = {
      precio_venta: 88888.88,
      descripcion: 'Obra actualizada durante smoke test',
    };
    const res = await axios.put(`${API}/catalogo/obras/${createdObraId}`, updateData, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.data.precio_venta == 88888.88 ||
      String(res.data.data.precio_venta).includes('88888'), 'Precio no actualizado');
  })();

  // =========================================================================
  // 10. Delete obra — DELETE /api/catalogo/obras/:id
  // =========================================================================
  await test('10. Delete obra — DELETE /api/catalogo/obras/:id', async () => {
    const res = await axios.delete(`${API}/catalogo/obras/${createdObraId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.message, 'Missing message');
  })();

  // =========================================================================
  // 11. Create genero — POST /api/catalogo/generos
  // =========================================================================
  await test('11. Create genero — POST /api/catalogo/generos', async () => {
    const generoData = {
      nombre: 'SmokeTest',
      descripcion: 'Género temporal del smoke test',
    };
    const res = await axios.post(`${API}/catalogo/generos`, generoData, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(201)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.data, 'Missing data');
    assertOk(res.data.data._id, 'Missing _id');
    createdGeneroId = res.data.data._id;
  })();

  // Limpiar género de prueba
  try {
    await axios.delete(`${API}/catalogo/generos/${createdGeneroId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (_) { /* ignore cleanup failure */ }

  // =========================================================================
  // 12. Create artista — POST /api/catalogo/artistas
  // =========================================================================
  await test('12. Create artista — POST /api/catalogo/artistas', async () => {
    const artistaData = {
      nombre: 'Smoke',
      apellido: 'Tester',
      biografia: 'Artista creado durante el smoke test',
      fecha_nacimiento: '1990-01-01',
      nacionalidad: 'Testland',
      porcentaje_ganancia: 5.0,
      generos_artisticos: ['Pintura'],
    };
    const res = await axios.post(`${API}/catalogo/artistas`, artistaData, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(201)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.data, 'Missing data');
    assertOk(res.data.data._id, 'Missing _id');
    createdArtistaId = res.data.data._id;
  })();

  // Limpiar artista de prueba
  try {
    await axios.delete(`${API}/catalogo/artistas/${createdArtistaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } catch (_) { /* ignore cleanup failure */ }

  // =========================================================================
  // 13. Detail page — GET /api/catalogo/:id
  // =========================================================================
  await test('13. Detail page — GET /api/catalogo/:id', async () => {
    assertOk(obraDetailId, 'No obra ID available from step 2');
    const res = await axios.get(`${API}/catalogo/${obraDetailId}`);
    assertStatusCode(200)(res);
    assertOk(res.data.success === true, 'Missing success flag');
    assertOk(res.data.data, 'Missing data');
  })();

  // =========================================================================
  // 14. Purchase flow — register user → login → pay membership → re-login
  //     → reserve obra → login admin → confirm sale
  // =========================================================================
  const testEmail = `smoke_${Date.now()}@test.com`;

  await test('14a. Register user — POST /api/usuarios/registro', async () => {
    const res = await axios.post(`${API}/usuarios/registro`, {
      email: testEmail,
      password: 'testpass123',
      nombre: 'Smoke',
      apellido: 'User',
    });
    assertStatusCode(201)(res);
    assertOk(res.data.id, 'Missing user id');
    assertOk(res.data.message, 'Missing message');
  })();

  await test('14b. Login as new user — POST /api/usuarios/login', async () => {
    const res = await axios.post(`${API}/usuarios/login`, {
      email: testEmail,
      password: 'testpass123',
    });
    assertStatusCode(200)(res);
    assertOk(res.data.token, 'Missing token');
    assertOk(res.data.usuario.tipo === 'usuario', `Expected 'usuario', got '${res.data.usuario.tipo}'`);
    userToken = res.data.token;
  })();

  await test('14c. Pay membership — POST /api/usuarios/membresia', async () => {
    const res = await axios.post(`${API}/usuarios/membresia`, {
      tarjeta_numero: '4111111111111111',
      tarjeta_nombre: 'Smoke User',
      tarjeta_expiracion: '12/28',
    }, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.message, 'Missing message');
    assertOk(res.data.codigo_seguridad, 'Missing codigo_seguridad');
    codigoSeguridad = res.data.codigo_seguridad;
  })();

  await test('14d. Re-login (get updated tipo=miembro)', async () => {
    const res = await axios.post(`${API}/usuarios/login`, {
      email: testEmail,
      password: 'testpass123',
    });
    assertStatusCode(200)(res);
    assertOk(res.data.token, 'Missing token');
    assertOk(res.data.usuario.tipo === 'miembro', `Expected 'miembro', got '${res.data.usuario.tipo}'`);
    userToken = res.data.token;
  })();

  await test('14e. Reserve obra — POST /api/ventas/reservar', async () => {
    // Get an available obra
    const catRes = await axios.get(`${API}/catalogo`, { params: { estado: 'Disponible', limit: 1 } });
    assertOk(catRes.data.data.length > 0, 'No available obras');
    const obraId = catRes.data.data[0]._id || catRes.data.data[0].obra_id;

    const res = await axios.post(`${API}/ventas/reservar`, {
      obra_id: obraId,
      codigo_seguridad: codigoSeguridad,
    }, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.venta_id, 'Missing venta_id');
    ventaId = res.data.venta_id;
  })();

  await test('14f. Login as admin — POST /api/usuarios/login', async () => {
    const res = await axios.post(`${API}/usuarios/login`, {
      email: 'admin@museo.com',
      password: 'admin123',
    });
    assertStatusCode(200)(res);
    assertOk(res.data.token, 'Missing token');
    adminToken = res.data.token;
  })();

  await test('14g. Confirm sale — PUT /api/ventas/:id/concretar', async () => {
    const res = await axios.put(`${API}/ventas/${ventaId}/concretar`, {
      direccion_envio: 'Calle Test 123, Ciudad Smoke, CP 00000',
    }, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assertStatusCode(200)(res);
    assertOk(res.data.message, 'Missing message');
  })();

  // =========================================================================
  // Results
  // =========================================================================
  const total = passed + failed;
  console.log(`\n📊 RESULTS: ${passed}/${total} passed, ${failed}/${total} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
