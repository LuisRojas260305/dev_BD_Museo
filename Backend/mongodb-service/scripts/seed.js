require('dotenv').config();
const mongoose = require('mongoose');
const Artista = require('../models/Artista');
const Obra = require('../models/Obra');
const Genero = require('../models/Genero');

const generosData = [
  { nombre: 'Pintura', descripcion: 'Arte pictórico sobre lienzo u otros soportes' },
  { nombre: 'Escultura', descripcion: 'Arte tridimensional tallado o modelado' },
  { nombre: 'Orfebrería', descripcion: 'Arte de trabajar metales preciosos' },
  { nombre: 'Cerámica', descripcion: 'Arte de crear objetos de arcilla cocida' },
  { nombre: 'Fotografía', descripcion: 'Arte de capturar imágenes mediante luz' },
];

const artistasData = [
  {
    nombre: 'Leonardo',
    apellido: 'da Vinci',
    biografia: 'Polímata renacentista italiano, pintor, escultor, inventor y científico.',
    fecha_nacimiento: new Date('1452-04-15'),
    nacionalidad: 'Italiana',
    porcentaje_ganancia: 10.0,
    generos_artisticos: ['Pintura'],
    fotos: [],
  },
  {
    nombre: 'Frida',
    apellido: 'Kahlo',
    biografia: 'Pintora mexicana icónica, conocida por sus autorretratos y obra surrealista.',
    fecha_nacimiento: new Date('1907-07-06'),
    nacionalidad: 'Mexicana',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Pintura'],
    fotos: [],
  },
  {
    nombre: 'Pablo',
    apellido: 'Picasso',
    biografia: 'Pintor y escultor español, co-fundador del cubismo.',
    fecha_nacimiento: new Date('1881-10-25'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 12.0,
    generos_artisticos: ['Pintura', 'Escultura'],
    fotos: [],
  },
  {
    nombre: 'Salvador',
    apellido: 'Dalí',
    biografia: 'Pintor surrealista español, famoso por sus obras oníricas y excéntricas.',
    fecha_nacimiento: new Date('1904-05-11'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 9.0,
    generos_artisticos: ['Pintura', 'Fotografía'],
    fotos: [],
  },
  {
    nombre: 'Auguste',
    apellido: 'Rodin',
    biografia: 'Escultor francés, considerado el padre de la escultura moderna.',
    fecha_nacimiento: new Date('1840-11-12'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 7.0,
    generos_artisticos: ['Escultura'],
    fotos: [],
  },
  {
    nombre: 'Ansel',
    apellido: 'Adams',
    biografia: 'Fotógrafo estadounidense, maestro de la fotografía de paisajes en blanco y negro.',
    fecha_nacimiento: new Date('1902-02-20'),
    nacionalidad: 'Estadounidense',
    porcentaje_ganancia: 6.0,
    generos_artisticos: ['Fotografía'],
    fotos: [],
  },
  {
    nombre: 'Bernard',
    apellido: 'Leach',
    biografia: 'Ceramista británico, pionero del estudio de cerámica artística en occidente.',
    fecha_nacimiento: new Date('1887-01-05'),
    nacionalidad: 'Británica',
    porcentaje_ganancia: 5.0,
    generos_artisticos: ['Cerámica'],
    fotos: [],
  },
  {
    nombre: 'René',
    apellido: 'Lalique',
    biografia: 'Orfebre y maestro vidriero francés, conocido por sus joyas art nouveau.',
    fecha_nacimiento: new Date('1860-04-06'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Orfebrería'],
    fotos: [],
  },
];

// ---- Datos de obras ----

const pinturasData = [
  {
    codigo_inventario: 'PINT-001',
    nombre: 'La Gioconda',
    genero: 'Pintura',
    precio_venta: 850000.0,
    alto: 77.0,
    ancho: 53.0,
    fecha_creacion: new Date('1506-01-01'),
    estado: 'Disponible',
    descripcion: 'Retrato de Lisa Gherardini, la obra más famosa del Renacimiento.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Renacimiento'], tematicas: ['Retrato'] },
  },
  {
    codigo_inventario: 'PINT-002',
    nombre: 'Las Dos Fridas',
    genero: 'Pintura',
    precio_venta: 450000.0,
    alto: 173.0,
    ancho: 173.0,
    fecha_creacion: new Date('1939-01-01'),
    estado: 'Disponible',
    descripcion: 'Doble autorretrato de Frida Kahlo representando sus dos personalidades.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Retrato', 'Identidad'] },
  },
  {
    codigo_inventario: 'PINT-003',
    nombre: 'Guernica',
    genero: 'Pintura',
    precio_venta: 1200000.0,
    alto: 349.0,
    ancho: 776.0,
    fecha_creacion: new Date('1937-01-01'),
    estado: 'Disponible',
    descripcion: 'Famoso mural que representa el bombardeo de Guernica durante la Guerra Civil Española.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Cubismo'], tematicas: ['Histórica', 'Política'] },
  },
  {
    codigo_inventario: 'PINT-004',
    nombre: 'La Persistencia de la Memoria',
    genero: 'Pintura',
    precio_venta: 680000.0,
    alto: 24.0,
    ancho: 33.0,
    fecha_creacion: new Date('1931-01-01'),
    estado: 'Disponible',
    descripcion: 'Famoso cuadro surrealista con relojes derritiéndose.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Tiempo', 'Memoria'] },
  },
  {
    codigo_inventario: 'PINT-005',
    nombre: 'Naturaleza Muerta',
    genero: 'Pintura',
    precio_venta: 280000.0,
    alto: 50.0,
    ancho: 40.0,
    fecha_creacion: new Date('1510-01-01'),
    estado: 'Disponible',
    descripcion: 'Estudio de elementos naturales y objetos inanimados.',
    fotos: [],
    detalles: { soporte: 'Madera', estilos: ['Renacimiento'], tematicas: ['Naturaleza'] },
  },
  {
    codigo_inventario: 'PINT-006',
    nombre: 'Autorretrato con Collar',
    genero: 'Pintura',
    precio_venta: 520000.0,
    alto: 60.0,
    ancho: 50.0,
    fecha_creacion: new Date('1933-01-01'),
    estado: 'Disponible',
    descripcion: 'Autorretrato de Frida Kahlo con collar de espinas.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Retrato', 'Sufrimiento'] },
  },
  {
    codigo_inventario: 'PINT-007',
    nombre: 'Mujer Llorando',
    genero: 'Pintura',
    precio_venta: 380000.0,
    alto: 60.0,
    ancho: 50.0,
    fecha_creacion: new Date('1937-01-01'),
    estado: 'Disponible',
    descripcion: 'Representación cubista de una mujer en llanto.',
    fotos: [],
    detalles: { soporte: 'Lienzo', estilos: ['Cubismo'], tematicas: ['Retrato', 'Emoción'] },
  },
];

const esculturasData = [
  {
    codigo_inventario: 'ESC-001',
    nombre: 'El Pensador',
    genero: 'Escultura',
    precio_venta: 320000.0,
    alto: 50.0,
    ancho: 30.0,
    fecha_creacion: new Date('1904-01-01'),
    estado: 'Disponible',
    descripcion: 'Escultura que representa a un hombre reflexionando, parte de La Puerta del Infierno.',
    fotos: [],
    detalles: { peso: 150.0, profundidad: 40.0, tipo_escultura: 'Bulto redondo', materiales: ['Bronce'], tecnicas: ['Fundición'] },
  },
  {
    codigo_inventario: 'ESC-002',
    nombre: 'El Beso',
    genero: 'Escultura',
    precio_venta: 410000.0,
    alto: 60.0,
    ancho: 40.0,
    fecha_creacion: new Date('1889-01-01'),
    estado: 'Disponible',
    descripcion: 'Escultura de mármol que representa una pareja abrazándose.',
    fotos: [],
    detalles: { peso: 200.0, profundidad: 50.0, tipo_escultura: 'Bulto redondo', materiales: ['Mármol'], tecnicas: ['Talla directa'] },
  },
];

const fotografiasData = [
  {
    codigo_inventario: 'FOT-001',
    nombre: 'Amanecer en Yosemite',
    genero: 'Fotografía',
    precio_venta: 95000.0,
    alto: 40.0,
    ancho: 50.0,
    fecha_creacion: new Date('1950-01-01'),
    estado: 'Disponible',
    descripcion: 'Fotografía icónica del amanecer en el Parque Nacional Yosemite.',
    fotos: [],
    detalles: {
      tiraje: 20, obturacion: '1/125', apertura: 'f/8', iso: 100,
      resolucion: '300dpi', fecha_captura: new Date('1950-06-15'),
      impresion: 'Papel brillante', camara: 'Réflex', tecnica_fotografica: 'Blanco y negro',
    },
  },
  {
    codigo_inventario: 'FOT-002',
    nombre: 'Relojes Blandos al Atardecer',
    genero: 'Fotografía',
    precio_venta: 120000.0,
    alto: 35.0,
    ancho: 45.0,
    fecha_creacion: new Date('1952-01-01'),
    estado: 'Disponible',
    descripcion: 'Fotomontaje surrealista con relojes derritiéndose en un paisaje desértico.',
    fotos: [],
    detalles: {
      tiraje: 15, obturacion: '1/60', apertura: 'f/11', iso: 200,
      resolucion: '300dpi', fecha_captura: new Date('1952-08-20'),
      impresion: 'Papel mate', camara: 'Gran formato', tecnica_fotografica: 'Blanco y negro',
    },
  },
];

const ceramicasData = [
  {
    codigo_inventario: 'CER-001',
    nombre: 'Jarrón de Cobre Reducción',
    genero: 'Cerámica',
    precio_venta: 45000.0,
    alto: 45.0,
    ancho: 30.0,
    fecha_creacion: new Date('1955-01-01'),
    estado: 'Disponible',
    descripcion: 'Jarrón de gres con esmalte de cobre reducción, técnica tradicional japonesa.',
    fotos: [],
    detalles: {
      profundidad: 30.0,
      diametro: 25.0,
      funcionalidad: 'Decorativo',
      coccion: 'Reducción a 1280°C',
      arcilla: 'Gres',
      modelado: 'Torno alfarero',
      esmaltado: 'Cobre reducción',
    },
  },
  {
    codigo_inventario: 'CER-002',
    nombre: 'Cuenco de Porcelana Celadón',
    genero: 'Cerámica',
    precio_venta: 28000.0,
    alto: 12.0,
    ancho: 22.0,
    fecha_creacion: new Date('1960-01-01'),
    estado: 'Disponible',
    descripcion: 'Cuenco de porcelana con esmalte celadón, inspirado en la cerámica coreana.',
    fotos: [],
    detalles: {
      profundidad: 12.0,
      diametro: 22.0,
      funcionalidad: 'Servicio de té',
      coccion: 'Oxidación a 1300°C',
      arcilla: 'Porcelana',
      modelado: 'Torno alfarero',
      esmaltado: 'Celadón',
    },
  },
];

const orfebreriasData = [
  {
    codigo_inventario: 'ORF-001',
    nombre: 'Collar Libélula Art Nouveau',
    genero: 'Orfebrería',
    precio_venta: 185000.0,
    alto: 5.0,
    ancho: 15.0,
    fecha_creacion: new Date('1902-01-01'),
    estado: 'Disponible',
    descripcion: 'Collar con colgante de libélula en esmalte y oro, obra maestra del Art Nouveau.',
    fotos: [],
    detalles: {
      profundidad: 1.0,
      diametro: 0.5,
      peso: 45.0,
      pieza: 'Collar',
      metal_predominante: 'Oro',
      metales: ['Oro', 'Plata'],
    },
  },
  {
    codigo_inventario: 'ORF-002',
    nombre: 'Copa de Oro Repujado',
    genero: 'Orfebrería',
    precio_venta: 98000.0,
    alto: 25.0,
    ancho: 12.0,
    fecha_creacion: new Date('1910-01-01'),
    estado: 'Disponible',
    descripcion: 'Copa ceremonial de oro trabajada con técnica de repujado y cincelado.',
    fotos: [],
    detalles: {
      profundidad: 12.0,
      diametro: 10.0,
      peso: 220.0,
      pieza: 'Copa',
      metal_predominante: 'Oro',
      metales: ['Oro', 'Cobre'],
    },
  },
];

// ---- Helpers ----

const nombreCompleto = (a) => `${a.nombre} ${a.apellido}`;

const asignarArtista = (obra, artistaDoc) => ({
  ...obra,
  artista_id: artistaDoc._id,
  artista: {
    nombre: artistaDoc.nombre,
    apellido: artistaDoc.apellido,
    nacionalidad: artistaDoc.nacionalidad,
  },
});

// ---- Seed function (exportable) ----

async function seed() {
  console.log('=== POBLANDO MONGODB ===\n');

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB conectado\n');
  }

  // Limpiar colecciones
  await Promise.all([
    Artista.deleteMany({}),
    Obra.deleteMany({}),
    Genero.deleteMany({}),
  ]);
  console.log('Colecciones limpiadas\n');

  // Insertar géneros
  const generos = await Genero.insertMany(generosData);
  console.log(`Géneros creados: ${generos.length}`);

  // Insertar artistas
  const insertedArtistas = await Artista.insertMany(artistasData);
  console.log(`Artistas creados: ${insertedArtistas.length}`);

  // Mapa nombre_completo → documento
  const artistaMap = {};
  insertedArtistas.forEach(a => {
    artistaMap[nombreCompleto(a)] = a;
  });

  // ---- Organizar obras por artista ----
  const asignar = (obra, nombreArtista) => asignarArtista(obra, artistaMap[nombreArtista]);

  // Pinturas
  const pinturasConRef = [
    asignar(pinturasData[0], 'Leonardo da Vinci'),
    asignar(pinturasData[1], 'Frida Kahlo'),
    asignar(pinturasData[2], 'Pablo Picasso'),
    asignar(pinturasData[3], 'Salvador Dalí'),
    asignar(pinturasData[4], 'Leonardo da Vinci'),
    asignar(pinturasData[5], 'Frida Kahlo'),
    asignar(pinturasData[6], 'Pablo Picasso'),
  ];

  // Esculturas
  const esculturasConRef = [
    asignar(esculturasData[0], 'Auguste Rodin'),
    asignar(esculturasData[1], 'Auguste Rodin'),
  ];

  // Fotografías
  const fotografiasConRef = [
    asignar(fotografiasData[0], 'Ansel Adams'),
    asignar(fotografiasData[1], 'Salvador Dalí'),
  ];

  // Cerámicas
  const ceramicasConRef = [
    asignar(ceramicasData[0], 'Bernard Leach'),
    asignar(ceramicasData[1], 'Bernard Leach'),
  ];

  // Orfebrerías
  const orfebreriasConRef = [
    asignar(orfebreriasData[0], 'René Lalique'),
    asignar(orfebreriasData[1], 'René Lalique'),
  ];

  // Insertar usando discriminadores
  const todas = [
    ...pinturasConRef,
    ...esculturasConRef,
    ...fotografiasConRef,
    ...ceramicasConRef,
    ...orfebreriasConRef,
  ];

  for (const obra of todas) {
    const DiscModel = mongoose.model(obra.genero);
    await DiscModel.create(obra);
  }

  console.log(`Obras creadas: ${todas.length}\n`);

  // ---- Resumen final ----
  const generoCount = await Genero.countDocuments();
  const artistaCount = await Artista.countDocuments();
  const obraCount = await Obra.countDocuments();

  console.log('=== RESUMEN ===');
  console.log(`  Géneros:     ${generoCount}`);
  console.log(`  Artistas:    ${artistaCount}`);
  console.log(`  Obras:       ${obraCount}`);
  console.log('\nSeed completado exitosamente');

  await mongoose.connection.close();
  console.log('Conexión cerrada');
}

// Ejecutar directo si es CLI
if (require.main === module) {
  seed().catch(err => {
    console.error('Error en seed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
