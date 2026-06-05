require('dotenv').config();
const mongoose = require('mongoose');
const Artista = require('../models/Artista');
const Obra = require('../models/Obra');

const artistas = [
  {
    artista_id_original: 1,
    nombre: 'Leonardo',
    apellido: 'da Vinci',
    biografia: 'Polímata renacentista italiano, pintor, escultor, inventor y científico.',
    fecha_nacimiento: new Date('1452-04-15'),
    nacionalidad: 'Italiana',
    porcentaje_ganancia: 10.0,
    generos_artisticos: ['Pintura'],
  },
  {
    artista_id_original: 2,
    nombre: 'Frida',
    apellido: 'Kahlo',
    biografia: 'Pintora mexicana icónica, conocida por sus autorretratos y obra surrealista.',
    fecha_nacimiento: new Date('1907-07-06'),
    nacionalidad: 'Mexicana',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Pintura'],
  },
  {
    artista_id_original: 3,
    nombre: 'Pablo',
    apellido: 'Picasso',
    biografia: 'Pintor y escultor español, co-fundador del cubismo.',
    fecha_nacimiento: new Date('1881-10-25'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 12.0,
    generos_artisticos: ['Pintura', 'Escultura'],
  },
  {
    artista_id_original: 4,
    nombre: 'Salvador',
    apellido: 'Dalí',
    biografia: 'Pintor surrealista español, famoso por sus obras oníricas y excéntricas.',
    fecha_nacimiento: new Date('1904-05-11'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 9.0,
    generos_artisticos: ['Pintura', 'Fotografía'],
  },
  {
    artista_id_original: 5,
    nombre: 'Auguste',
    apellido: 'Rodin',
    biografia: 'Escultor francés, considerado el padre de la escultura moderna.',
    fecha_nacimiento: new Date('1840-11-12'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 7.0,
    generos_artisticos: ['Escultura'],
  },
  {
    artista_id_original: 6,
    nombre: 'Ansel',
    apellido: 'Adams',
    biografia: 'Fotógrafo estadounidense, maestro de la fotografía de paisajes en blanco y negro.',
    fecha_nacimiento: new Date('1902-02-20'),
    nacionalidad: 'Estadounidense',
    porcentaje_ganancia: 6.0,
    generos_artisticos: ['Fotografía'],
  },
];

const pinturas = [
  {
    obra_id_original: 1001,
    codigo_inventario: 'PINT-001',
    nombre: 'La Gioconda',
    genero: 'Pintura',
    precio_venta: 850000.0,
    alto: 77.0,
    ancho: 53.0,
    fecha_creacion: new Date('1506-01-01'),
    estado: 'Disponible',
    descripcion: 'Retrato de Lisa Gherardini, la obra más famosa del Renacimiento.',
    detalles: { soporte: 'Lienzo', estilos: ['Renacimiento'], tematicas: ['Retrato'] },
  },
  {
    obra_id_original: 1002,
    codigo_inventario: 'PINT-002',
    nombre: 'Las Dos Fridas',
    genero: 'Pintura',
    precio_venta: 450000.0,
    alto: 173.0,
    ancho: 173.0,
    fecha_creacion: new Date('1939-01-01'),
    estado: 'Disponible',
    descripcion: 'Doble autorretrato de Frida Kahlo representando sus dos personalidades.',
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Retrato', 'Identidad'] },
  },
  {
    obra_id_original: 1003,
    codigo_inventario: 'PINT-003',
    nombre: 'Guernica',
    genero: 'Pintura',
    precio_venta: 1200000.0,
    alto: 349.0,
    ancho: 776.0,
    fecha_creacion: new Date('1937-01-01'),
    estado: 'Disponible',
    descripcion: 'Famoso mural que representa el bombardeo de Guernica durante la Guerra Civil Española.',
    detalles: { soporte: 'Lienzo', estilos: ['Cubismo'], tematicas: ['Histórica', 'Política'] },
  },
  {
    obra_id_original: 1004,
    codigo_inventario: 'PINT-004',
    nombre: 'La Persistencia de la Memoria',
    genero: 'Pintura',
    precio_venta: 680000.0,
    alto: 24.0,
    ancho: 33.0,
    fecha_creacion: new Date('1931-01-01'),
    estado: 'Disponible',
    descripcion: 'Famoso cuadro surrealista con relojes derritiéndose.',
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Tiempo', 'Memoria'] },
  },
  {
    obra_id_original: 1005,
    codigo_inventario: 'PINT-005',
    nombre: 'Naturaleza Muerta',
    genero: 'Pintura',
    precio_venta: 280000.0,
    alto: 50.0,
    ancho: 40.0,
    fecha_creacion: new Date('1510-01-01'),
    estado: 'Disponible',
    descripcion: 'Estudio de elementos naturales y objetos inanimados.',
    detalles: { soporte: 'Madera', estilos: ['Renacimiento'], tematicas: ['Naturaleza'] },
  },
  {
    obra_id_original: 1006,
    codigo_inventario: 'PINT-006',
    nombre: 'Autorretrato con Collar',
    genero: 'Pintura',
    precio_venta: 520000.0,
    alto: 60.0,
    ancho: 50.0,
    fecha_creacion: new Date('1933-01-01'),
    estado: 'Disponible',
    descripcion: 'Autorretrato de Frida Kahlo con collar de espinas.',
    detalles: { soporte: 'Lienzo', estilos: ['Surrealismo'], tematicas: ['Retrato', 'Sufrimiento'] },
  },
  {
    obra_id_original: 1007,
    codigo_inventario: 'PINT-007',
    nombre: 'Mujer Llorando',
    genero: 'Pintura',
    precio_venta: 380000.0,
    alto: 60.0,
    ancho: 50.0,
    fecha_creacion: new Date('1937-01-01'),
    estado: 'Disponible',
    descripcion: 'Representación cubista de una mujer en llanto.',
    detalles: { soporte: 'Lienzo', estilos: ['Cubismo'], tematicas: ['Retrato', 'Emoción'] },
  },
];

const esculturas = [
  {
    obra_id_original: 2001,
    codigo_inventario: 'ESC-001',
    nombre: 'El Pensador',
    genero: 'Escultura',
    precio_venta: 320000.0,
    alto: 50.0,
    ancho: 30.0,
    fecha_creacion: new Date('1904-01-01'),
    estado: 'Disponible',
    descripcion: 'Escultura que representa a un hombre reflexionando, parte de La Puerta del Infierno.',
    detalles: { peso: 150.0, profundidad: 40.0, tipo_escultura: 'Bulto redondo', materiales: ['Bronce'], tecnicas: ['Fundición'] },
  },
  {
    obra_id_original: 2002,
    codigo_inventario: 'ESC-002',
    nombre: 'El Beso',
    genero: 'Escultura',
    precio_venta: 410000.0,
    alto: 60.0,
    ancho: 40.0,
    fecha_creacion: new Date('1889-01-01'),
    estado: 'Disponible',
    descripcion: 'Escultura de mármol que representa una pareja abrazándose.',
    detalles: { peso: 200.0, profundidad: 50.0, tipo_escultura: 'Bulto redondo', materiales: ['Mármol'], tecnicas: ['Talla directa'] },
  },
];

const fotografias = [
  {
    obra_id_original: 3001,
    codigo_inventario: 'FOT-001',
    nombre: 'Amanecer en Yosemite',
    genero: 'Fotografía',
    precio_venta: 95000.0,
    alto: 40.0,
    ancho: 50.0,
    fecha_creacion: new Date('1950-01-01'),
    estado: 'Disponible',
    descripcion: 'Fotografía icónica del amanecer en el Parque Nacional Yosemite.',
    detalles: {
      tiraje: 20, obturacion: '1/125', apertura: 'f/8', iso: 100,
      resolucion: '300dpi', fecha_captura: new Date('1950-06-15'),
      impresion: 'Papel brillante', camara: 'Réflex', tecnica_fotografica: 'Blanco y negro',
    },
  },
];

async function seed() {
  console.log('=== POBLANDO MONGODB ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado\n');

  // Limpiar colecciones
  await Promise.all([
    Artista.deleteMany({}),
    Obra.deleteMany({}),
  ]);
  console.log('Colecciones limpiadas\n');

  // Insertar artistas
  const insertedArtistas = await Artista.insertMany(artistas);
  console.log(`Artistas creados: ${insertedArtistas.length}`);

  // Mapa nombre_completo → _id
  const artistaMap = {};
  insertedArtistas.forEach(a => {
    const key = `${a.nombre} ${a.apellido}`;
    artistaMap[key] = a._id;
  });

  // Helper para asignar artista_id + embbeder datos del artista
  const asignarArtista = (obra, nombreCompleto) => {
    const artista = insertedArtistas.find(a => `${a.nombre} ${a.apellido}` === nombreCompleto);
    return {
      ...obra,
      artista_id: artistaMap[nombreCompleto],
      artista: {
        nombre: artista?.nombre || '',
        apellido: artista?.apellido || '',
        nacionalidad: artista?.nacionalidad || '',
      },
    };
  };

  // Insertar pinturas
  const pinturasConRef = [
    asignarArtista(pinturas[0], 'Leonardo da Vinci'),
    asignarArtista(pinturas[1], 'Frida Kahlo'),
    asignarArtista(pinturas[2], 'Pablo Picasso'),
    asignarArtista(pinturas[3], 'Salvador Dalí'),
    asignarArtista(pinturas[4], 'Leonardo da Vinci'),
    asignarArtista(pinturas[5], 'Frida Kahlo'),
    asignarArtista(pinturas[6], 'Pablo Picasso'),
  ];

  const esculturasConRef = [
    asignarArtista(esculturas[0], 'Auguste Rodin'),
    asignarArtista(esculturas[1], 'Auguste Rodin'),
  ];

  const fotografiasConRef = [
    asignarArtista(fotografias[0], 'Ansel Adams'),
  ];

  const todas = [...pinturasConRef, ...esculturasConRef, ...fotografiasConRef];

  for (const obra of todas) {
    const DiscModel = mongoose.model(obra.genero);
    await DiscModel.create(obra);
  }

  console.log(`Obras creadas: ${todas.length}\n`);

  // Índices ya creados por mongoose desde los schemas — no duplicar

  // Verificar
  const artistaCount = await Artista.countDocuments();
  const obraCount = await Obra.countDocuments();
  console.log(`Verificación:`);
  console.log(`  Artistas: ${artistaCount}`);
  console.log(`  Obras: ${obraCount}`);
  console.log('\nSeed completado exitosamente');

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
