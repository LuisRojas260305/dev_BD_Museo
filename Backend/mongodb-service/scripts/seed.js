require('dotenv').config();
const mongoose = require('mongoose');
const Artista = require('../models/Artista');
const Obra = require('../models/Obra');

const artistas = [
  {
    nombre: 'Pablo',
    apellido: 'Ruiz',
    biografia: 'Pintor y escultor español, cofundador del cubismo.',
    fecha_nacimiento: new Date('1881-10-25'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 10.0,
    generos_artisticos: ['Pintura', 'Escultura'],
  },
  {
    nombre: 'Salvador',
    apellido: 'Dalí',
    biografia: 'Pintor surrealista español, conocido por sus obras oníricas.',
    fecha_nacimiento: new Date('1904-05-11'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Pintura', 'Fotografía'],
  },
  {
    nombre: 'Henry',
    apellido: 'Moore',
    biografia: 'Escultor británico conocido por sus grandes obras abstractas.',
    fecha_nacimiento: new Date('1898-07-30'),
    nacionalidad: 'Británica',
    porcentaje_ganancia: 7.5,
    generos_artisticos: ['Escultura'],
  },
];

const obras = [
  {
    obra_id_original: 1001,
    codigo_inventario: 'PINT-001',
    nombre: 'La persistencia de la memoria',
    artista: { nombre: 'Salvador', apellido: 'Dalí', nacionalidad: 'Española' },
    genero: 'Pintura',
    epoca: { nombre: 'Surrealismo', ano_inicio: 1920, ano_final: 1940 },
    precio_venta: 55000000.0,
    alto: 24.1,
    ancho: 33.0,
    fecha_creacion: new Date('1931-01-01'),
    estado: 'Disponible',
    descripcion: 'Famoso cuadro surrealista con relojes derritiéndose.',
    detalles: {
      soporte: 'Lienzo',
      estilos: ['Surrealismo'],
      tematicas: ['Tiempo', 'Memoria', 'Sueños'],
    },
  },
  {
    obra_id_original: 1002,
    codigo_inventario: 'ESC-001',
    nombre: 'Figura reclinada',
    artista: { nombre: 'Henry', apellido: 'Moore', nacionalidad: 'Británica' },
    genero: 'Escultura',
    epoca: { nombre: 'Modernismo', ano_inicio: 1900, ano_final: 1950 },
    precio_venta: 12000000.0,
    alto: 50.0,
    ancho: 30.0,
    fecha_creacion: new Date('1938-01-01'),
    estado: 'Disponible',
    descripcion: 'Escultura abstracta de figura femenina reclinada.',
    detalles: {
      peso: 150.0,
      profundidad: 20.0,
      tipo_escultura: 'Abstracta',
      materiales: ['Mármol'],
      tecnicas: ['Tallado directo'],
    },
  },
  {
    obra_id_original: 1003,
    codigo_inventario: 'ORF-001',
    nombre: 'Cáliz ceremonial maya',
    artista: { nombre: 'Pablo', apellido: 'Ruiz', nacionalidad: 'Española' },
    genero: 'Orfebrería',
    epoca: { nombre: 'Contemporáneo', ano_inicio: 1950, ano_final: 2000 },
    precio_venta: 8500000.0,
    alto: 35.0,
    ancho: 15.0,
    fecha_creacion: new Date('1965-01-01'),
    estado: 'Disponible',
    descripcion: 'Cáliz decorativo con influencias precolombinas.',
    detalles: {
      profundidad: 15.0,
      diametro: 12.0,
      peso: 2.5,
      pieza: 'Cáliz',
      metal_predominante: 'Oro',
      metales: ['Oro', 'Plata'],
    },
  },
  {
    obra_id_original: 1004,
    codigo_inventario: 'CER-001',
    nombre: 'Jarrón de Talavera',
    artista: { nombre: 'Pablo', apellido: 'Ruiz', nacionalidad: 'Española' },
    genero: 'Cerámica',
    epoca: { nombre: 'Barroco', ano_inicio: 1600, ano_final: 1750 },
    precio_venta: 3200000.0,
    alto: 60.0,
    ancho: 25.0,
    fecha_creacion: new Date('1700-01-01'),
    estado: 'Vendida',
    descripcion: 'Jarrón decorativo de Talavera de la Reina.',
    detalles: {
      profundidad: 25.0,
      diametro: 20.0,
      funcionalidad: 'Decorativo',
      coccion: 'Oxidación',
      arcilla: 'Barro blanco',
      modelado: 'Torno',
      esmaltado: 'Estaño',
    },
  },
  {
    obra_id_original: 1005,
    codigo_inventario: 'FOT-001',
    nombre: 'Retrato surrealista',
    artista: { nombre: 'Salvador', apellido: 'Dalí', nacionalidad: 'Española' },
    genero: 'Fotografía',
    epoca: { nombre: 'Surrealismo', ano_inicio: 1920, ano_final: 1940 },
    precio_venta: 4500000.0,
    alto: 40.0,
    ancho: 30.0,
    fecha_creacion: new Date('1935-01-01'),
    estado: 'Reservada',
    descripcion: 'Fotografía experimental con técnicas de doble exposición.',
    detalles: {
      tiraje: 10,
      obturacion: '1/125',
      apertura: 'f/8',
      iso: 100,
      resolucion: '300dpi',
      fecha_captura: new Date('1935-06-15'),
      impresion: 'Gelatina de plata',
      camara: 'Leica III',
      tecnica_fotografica: 'Doble exposición',
    },
  },
];

async function seed() {
  console.log('=== POBLANDO DATOS DE EJEMPLO ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado\n');

  await Promise.all([
    Artista.deleteMany({}),
    Obra.deleteMany({}),
  ]);

  const insertedArtistas = await Artista.insertMany(artistas);
  console.log(`Artistas creados: ${insertedArtistas.length}`);

  const artistaMap = {};
  insertedArtistas.forEach(a => {
    const key = `${a.nombre} ${a.apellido}`;
    artistaMap[key] = a._id;
  });

  const obrasConRef = obras.map(o => ({
    ...o,
    artista_id: artistaMap[`${o.artista.nombre} ${o.artista.apellido}`],
  }));

  const ObraModel = require('../models/Obra');
  for (const obra of obrasConRef) {
    const discriminators = {
      Pintura: 'Pintura',
      Escultura: 'Escultura',
      Orfebrería: 'Orfebrería',
      Cerámica: 'Cerámica',
      Fotografía: 'Fotografía',
    };
    await ObraModel.discriminator(discriminators[obra.genero]).create(obra);
  }

  console.log(`Obras creadas: ${obras.length}`);
  console.log('\nSeed completado exitosamente');

  await mongoose.connection.close();
}

seed().catch(err => {
  console.error('Error en seed:', err);
  process.exit(1);
});
