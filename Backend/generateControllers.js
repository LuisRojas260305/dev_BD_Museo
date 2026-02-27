const fs = require('fs');
const path = require('path');

// Lista de tablas catálogo con su carpeta destino y el idField correcto (según schema.sql)
const tables = [
  { name: 'Nacionalidad', folder: 'Artista', idField: 'nacionalidad_id' },
  { name: 'Pieza_Orfebreria', folder: 'Orfebreria', idField: 'pieza_id' },
  { name: 'Metales', folder: 'Orfebreria', idField: 'metal_id' },
  { name: 'Soporte', folder: 'Pintura', idField: 'soporte_id' },
  { name: 'Estilo', folder: 'Pintura', idField: 'estilo_id' },
  { name: 'Tematica', folder: 'Pintura', idField: 'tematica_id' },
  { name: 'Tipo_Escultura', folder: 'Escultura', idField: 'tipo_id' },
  { name: 'Material', folder: 'Escultura', idField: 'material_id' },
  { name: 'Tecnica_Escultura', folder: 'Escultura', idField: 'tecnica_id' },
  { name: 'Impresion', folder: 'Fotografia', idField: 'impresion_id' },
  { name: 'Tecnica_Fotografica', folder: 'Fotografia', idField: 'tecnica_id' },
  { name: 'Camara', folder: 'Fotografia', idField: 'camara_id' },
  { name: 'Arcilla', folder: 'Ceramica', idField: 'arcilla_id' },
  { name: 'Coccion', folder: 'Ceramica', idField: 'coccion_id' },
  { name: 'Modelado', folder: 'Ceramica', idField: 'modelado_id' },
  { name: 'Esmaltado', folder: 'Ceramica', idField: 'esmaltado_id' }
  // PreguntaSeguridad excluida por solicitud
];

const basePath = path.join(__dirname, 'controllers');

tables.forEach(table => {
  const folderPath = path.join(basePath, table.folder);
  // Crear carpeta si no existe
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Nombre del archivo: nombre de tabla en minúscula + 'Controller.js'
  const fileName = `${table.name.toLowerCase()}Controller.js`;
  const filePath = path.join(folderPath, fileName);

  // Opciones: solo idField, ya que todas usan 'nombre' como campo de nombre
  const options = { idField: table.idField };

  // Generar contenido del controlador
  const content = `const createGenericController = require('../../utils/genericController');\n\nmodule.exports = createGenericController('${table.name}', ${JSON.stringify(options)});\n`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Creado: ${filePath}`);
});

console.log('\n🎉 ¡Todos los controladores han sido generados con los idField correctos!');