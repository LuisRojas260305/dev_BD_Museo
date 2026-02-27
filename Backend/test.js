const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Lista de tablas catálogo con su campo ID y campos a enviar
const tables = [
  { name: 'nacionalidad', idField: 'nacionalidad_id', fields: ['nombre', 'comentario'] },
  { name: 'arcilla', idField: 'arcilla_id', fields: ['nombre', 'comentario'] },
  { name: 'coccion', idField: 'coccion_id', fields: ['nombre', 'comentario'] },
  { name: 'esmaltado', idField: 'esmaltado_id', fields: ['nombre', 'comentario'] },
  { name: 'modelado', idField: 'modelado_id', fields: ['nombre', 'comentario'] },
  { name: 'tipo_escultura', idField: 'tipo_id', fields: ['nombre', 'comentario'] },
  { name: 'material', idField: 'material_id', fields: ['nombre', 'comentario'] },
  { name: 'tecnica_escultura', idField: 'tecnica_id', fields: ['nombre', 'comentario'] },
  { name: 'impresion', idField: 'impresion_id', fields: ['nombre', 'comentario'] },
  { name: 'tecnica_fotografica', idField: 'tecnica_id', fields: ['nombre', 'comentario'] },
  { name: 'camara', idField: 'camara_id', fields: ['nombre', 'comentario'] },
  { name: 'soporte', idField: 'soporte_id', fields: ['nombre', 'comentario'] },
  { name: 'estilo', idField: 'estilo_id', fields: ['nombre', 'comentario'] },
  { name: 'tematica', idField: 'tematica_id', fields: ['nombre', 'comentario'] },
  { name: 'pieza_orfebreria', idField: 'pieza_id', fields: ['nombre', 'comentario'] },
  { name: 'metales', idField: 'metal_id', fields: ['nombre', 'comentario'] }
];

async function testTable(table) {
  console.log(`\n🧪 Probando ${table.name}...`);
  const url = `${BASE_URL}/api/${table.name}`;
  let id = null;
  const timestamp = Date.now();

  try {
    // 1. Crear
    const createData = {
      nombre: `Test ${table.name} ${timestamp}`,
      comentario: 'Creado por test automático'
    };
    const createRes = await axios.post(url, createData);
    if (createRes.status !== 201) throw new Error(`POST falló: ${createRes.status}`);
    id = createRes.data.id;
    console.log(`   ✅ Creado con id ${id}`);

    // 2. Listar y verificar que existe
    const listRes = await axios.get(url);
    const found = listRes.data.find(item => item[table.idField] === id);
    if (!found) throw new Error('No se encontró el registro creado');
    console.log(`   ✅ Encontrado en GET`);

    // 3. Modificar
    const updateData = {
      nombre: `Test ${table.name} modificado ${timestamp}`,
      comentario: 'Modificado por test'
    };
    const updateRes = await axios.put(`${url}/${id}`, updateData);
    if (updateRes.status !== 200) throw new Error(`PUT falló: ${updateRes.status}`);
    console.log(`   ✅ Modificado`);

    // 4. Verificar modificación
    const listRes2 = await axios.get(url);
    const found2 = listRes2.data.find(item => item[table.idField] === id);
    if (!found2 || !found2.nombre.includes('modificado')) {
      throw new Error('La modificación no se reflejó');
    }
    console.log(`   ✅ Verificado cambio`);

    // 5. Eliminar
    const deleteRes = await axios.delete(`${url}/${id}`);
    if (deleteRes.status !== 200) throw new Error(`DELETE falló: ${deleteRes.status}`);
    console.log(`   ✅ Eliminado`);

    return { table: table.name, success: true };
  } catch (error) {
    console.error(`   ❌ Error en ${table.name}:`, error.response?.data || error.message);
    // Si hubo error y se creó un id, intentamos limpiar
    if (id) {
      try {
        await axios.delete(`${url}/${id}`);
        console.log(`   🧹 Limpieza: eliminado registro ${id}`);
      } catch (e) {}
    }
    return { table: table.name, success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas automáticas de API');
  let results = [];
  for (const table of tables) {
    const result = await testTable(table);
    results.push(result);
  }
  console.log('\n📊 Resumen:');
  results.forEach(r => {
    console.log(`   ${r.success ? '✅' : '❌'} ${r.table}`);
  });
  const failed = results.filter(r => !r.success);
  if (failed.length === 0) {
    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');
  } else {
    console.log(`\n⚠️  ${failed.length} pruebas fallaron.`);
  }
}

runTests();