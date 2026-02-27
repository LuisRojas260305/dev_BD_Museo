const fs = require('fs');
const path = require('path');

// Lista de tablas catálogo (las mismas que usamos para los controladores)
const tables = [
  { name: 'Nacionalidad', folder: 'Artista' },
  { name: 'Pieza_Orfebreria', folder: 'Orfebreria' },
  { name: 'Metales', folder: 'Orfebreria' },
  { name: 'Soporte', folder: 'Pintura' },
  { name: 'Estilo', folder: 'Pintura' },
  { name: 'Tematica', folder: 'Pintura' },
  { name: 'Tipo_Escultura', folder: 'Escultura' },
  { name: 'Material', folder: 'Escultura' },
  { name: 'Tecnica_Escultura', folder: 'Escultura' },
  { name: 'Impresion', folder: 'Fotografia' },
  { name: 'Tecnica_Fotografica', folder: 'Fotografia' },
  { name: 'Camara', folder: 'Fotografia' },
  { name: 'Arcilla', folder: 'Ceramica' },
  { name: 'Coccion', folder: 'Ceramica' },
  { name: 'Modelado', folder: 'Ceramica' },
  { name: 'Esmaltado', folder: 'Ceramica' }
];

const basePath = path.join(__dirname, 'routes');

tables.forEach(table => {
  const folderPath = path.join(basePath, table.folder);
  // Crear carpeta si no existe
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Nombre del archivo: nombre de la tabla en minúsculas (ej. 'pieza_orfebreria.js')
  const fileName = `${table.name.toLowerCase()}.js`;
  const filePath = path.join(folderPath, fileName);

  // Ruta relativa al controlador (desde routes hasta controllers)
  const controllerPath = `../../controllers/${table.folder}/${table.name.toLowerCase()}Controller`;

  const content = `const express = require('express');
const router = express.Router();
const controller = require('${controllerPath}');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
`;

  fs.writeFileSync(filePath, content);
  console.log(`✅ Ruta creada: ${filePath}`);
});

console.log('\n🎉 ¡Todos los archivos de ruta han sido generados!');