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
  { nombre: 'Cristalería', descripcion: 'Arte de crear objetos decorativos y funcionales en vidrio' },
  { nombre: 'Textil', descripcion: 'Arte de crear tapices, bordados y tejidos artísticos' },
  { nombre: 'Grabado', descripcion: 'Arte de incisión sobre matrices para obtener estampas' },
  { nombre: 'Acuarela', descripcion: 'Técnica pictórica con pigmentos diluidos en agua sobre papel' },
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Leonardo_self.jpg',
    ],
  },
  {
    nombre: 'Frida',
    apellido: 'Kahlo',
    biografia: 'Pintora mexicana icónica, conocida por sus autorretratos y obra surrealista.',
    fecha_nacimiento: new Date('1907-07-06'),
    nacionalidad: 'Mexicana',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Pintura'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
    ],
  },
  {
    nombre: 'Pablo',
    apellido: 'Picasso',
    biografia: 'Pintor y escultor español, co-fundador del cubismo.',
    fecha_nacimiento: new Date('1881-10-25'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 12.0,
    generos_artisticos: ['Pintura', 'Escultura'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Pablo_picasso_1.jpg',
    ],
  },
  {
    nombre: 'Salvador',
    apellido: 'Dalí',
    biografia: 'Pintor surrealista español, famoso por sus obras oníricas y excéntricas.',
    fecha_nacimiento: new Date('1904-05-11'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 9.0,
    generos_artisticos: ['Pintura', 'Fotografía'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Salvador_Dali_NYWTS.jpg',
    ],
  },
  {
    nombre: 'Auguste',
    apellido: 'Rodin',
    biografia: 'Escultor francés, considerado el padre de la escultura moderna.',
    fecha_nacimiento: new Date('1840-11-12'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 7.0,
    generos_artisticos: ['Escultura'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Auguste_Rodin.jpg',
    ],
  },
  {
    nombre: 'Ansel',
    apellido: 'Adams',
    biografia: 'Fotógrafo estadounidense, maestro de la fotografía de paisajes en blanco y negro.',
    fecha_nacimiento: new Date('1902-02-20'),
    nacionalidad: 'Estadounidense',
    porcentaje_ganancia: 6.0,
    generos_artisticos: ['Fotografía'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Ansel_Adams_and_camera.jpg',
    ],
  },
  {
    nombre: 'Bernard',
    apellido: 'Leach',
    biografia: 'Ceramista británico, pionero del estudio de cerámica artística en occidente.',
    fecha_nacimiento: new Date('1887-01-05'),
    nacionalidad: 'Británica',
    porcentaje_ganancia: 5.0,
    generos_artisticos: ['Cerámica'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Bernard_Leach_1953.jpg',
    ],
  },
  {
    nombre: 'René',
    apellido: 'Lalique',
    biografia: 'Orfebre y maestro vidriero francés, conocido por sus joyas art nouveau.',
    fecha_nacimiento: new Date('1860-04-06'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 8.0,
    generos_artisticos: ['Orfebrería', 'Cristalería'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Ren%C3%A9_Lalique_01.jpg',
    ],
  },
  {
    nombre: 'Émile',
    apellido: 'Gallé',
    biografia: 'Maestro vidriero y ceramista francés, figura central del Art Nouveau de Nancy.',
    fecha_nacimiento: new Date('1846-05-04'),
    nacionalidad: 'Francesa',
    porcentaje_ganancia: 7.0,
    generos_artisticos: ['Cristalería', 'Cerámica'],
    fotos: [
      'https://placehold.co/300x300/1a4a6e/white?text=Emile+Galle',
    ],
  },
  {
    nombre: 'William',
    apellido: 'Morris',
    biografia: 'Diseñador y artista británico, fundador del movimiento Arts and Crafts, maestro del diseño textil.',
    fecha_nacimiento: new Date('1834-03-24'),
    nacionalidad: 'Británica',
    porcentaje_ganancia: 6.0,
    generos_artisticos: ['Textil'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/William_Morris_age_53.jpg',
    ],
  },
  {
    nombre: 'Francisco',
    apellido: 'Goya',
    biografia: 'Pintor y grabador español, maestro del Romanticismo y precursor del arte moderno.',
    fecha_nacimiento: new Date('1746-03-30'),
    nacionalidad: 'Española',
    porcentaje_ganancia: 11.0,
    generos_artisticos: ['Grabado', 'Pintura'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Goya_self-portrait_%281815%2C_Real_Academia_de_Bellas_Artes_de_San_Fernando%29.jpg',
    ],
  },
  {
    nombre: 'John Singer',
    apellido: 'Sargent',
    biografia: 'Pintor estadounidense-británico, el acuarelista más virtuoso de finales del siglo XIX.',
    fecha_nacimiento: new Date('1856-01-12'),
    nacionalidad: 'Estadounidense',
    porcentaje_ganancia: 7.0,
    generos_artisticos: ['Acuarela', 'Pintura'],
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/John_Singer_Sargent_-_Self-Portrait.jpg',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    ],
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
    fotos: [
      'https://placehold.co/600x600/6c3483/white?text=Las+Dos+Fridas',
    ],
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
    fotos: [
      'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg',
    ],
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
    fotos: [
      'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Leonardo_da_Vinci_Virgin_of_the_Rocks_(National_Gallery_London).jpg',
    ],
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
    fotos: [
      'https://placehold.co/500x600/922b21/white?text=Autorretrato+con+Collar',
    ],
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
    fotos: [
      'https://placehold.co/500x600/1a2f4a/white?text=Mujer+Llorando',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Rodin_TheThinker.jpg',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Le_baiser_d%27Auguste_Rodin.jpg',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Ansel-adams-monolith-the-face-of-half-dome_-_edit1.jpg',
    ],
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
    fotos: [
      'https://placehold.co/640x480/1a1a2e/white?text=Relojes+Blandos+al+Atardecer',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Vase_with_fish_by_Bernard_Leach%2C_V%26A_London.jpg',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Celadon_Bowl_with_Inlaid_Flower_and_Insect_Design.jpg',
    ],
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
    fotos: [
      'https://placehold.co/500x500/d4ac0d/white?text=Collar+Libelula+Art+Nouveau',
    ],
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
    fotos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Golden_cup_from_Vafio_1500_to_1450_BC%2C_NAMA_1759_080869.jpg',
    ],
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

const cristaleriasData = [
  {
    codigo_inventario: 'CRIS-001',
    nombre: 'Jarrón Libélulas en Cristal Opaco',
    genero: 'Cristalería',
    precio_venta: 62000.0,
    alto: 32.0,
    ancho: 18.0,
    fecha_creacion: new Date('1900-01-01'),
    estado: 'Disponible',
    descripcion: 'Jarrón de cristal opalescente con motivos de libélulas en relieve, técnica pâte de verre.',
    fotos: ['https://placehold.co/500x600/1a4a6e/white?text=Jarron+Libelulas+Cristal'],
    detalles: { tipo_vidrio: 'Opalescente', tecnica: 'Pâte de verre', transparencia: 'Translúcido', color: 'Blanco nacarado', profundidad: 18.0, diametro: 18.0, peso: 1.2 },
  },
  {
    codigo_inventario: 'CRIS-002',
    nombre: 'Florero Camafeo Iris',
    genero: 'Cristalería',
    precio_venta: 87000.0,
    alto: 45.0,
    ancho: 22.0,
    fecha_creacion: new Date('1895-01-01'),
    estado: 'Disponible',
    descripcion: 'Florero de vidrio camafeo con flores de iris talladas sobre fondo azul marino.',
    fotos: ['https://placehold.co/500x700/0d2137/white?text=Florero+Camafeo+Iris'],
    detalles: { tipo_vidrio: 'Camafeo', tecnica: 'Tallado y grabado al ácido', transparencia: 'Translúcido', color: 'Azul sobre blanco', profundidad: 22.0, diametro: 20.0, peso: 1.8 },
  },
];

const textilesData = [
  {
    codigo_inventario: 'TEXT-001',
    nombre: 'Tapiz Fresa y Pájaro',
    genero: 'Textil',
    precio_venta: 34000.0,
    alto: 120.0,
    ancho: 90.0,
    fecha_creacion: new Date('1883-01-01'),
    estado: 'Disponible',
    descripcion: 'Tapiz tejido con motivo de fresas y aves, diseño icónico de la colección Arts and Crafts.',
    fotos: ['https://commons.wikimedia.org/wiki/Special:FilePath/Morris_Strawberry_Thief_1883.jpg'],
    detalles: { tipo_tejido: 'Tapiz jacquard', fibra: ['Algodón', 'Lana'], tecnica: 'Tapicería', urdimbre: 'Algodón crudo', trama: 'Lana teñida con índigo' },
  },
  {
    codigo_inventario: 'TEXT-002',
    nombre: 'Panel Bordado Acanto',
    genero: 'Textil',
    precio_venta: 21000.0,
    alto: 80.0,
    ancho: 60.0,
    fecha_creacion: new Date('1875-01-01'),
    estado: 'Disponible',
    descripcion: 'Panel bordado con hojas de acanto entrelazadas sobre fondo de seda cruda.',
    fotos: ['https://placehold.co/600x800/2e4a1e/white?text=Panel+Bordado+Acanto'],
    detalles: { tipo_tejido: 'Bordado en seda', fibra: ['Seda', 'Hilo de oro'], tecnica: 'Bordado a aguja', urdimbre: 'Seda cruda', trama: 'Hilos de colores' },
  },
];

const grabadosData = [
  {
    codigo_inventario: 'GRAB-001',
    nombre: 'El Sueño de la Razón',
    genero: 'Grabado',
    precio_venta: 145000.0,
    alto: 21.5,
    ancho: 15.0,
    fecha_creacion: new Date('1799-01-01'),
    estado: 'Disponible',
    descripcion: 'Aguafuerte y aguatinta, placa 43 de Los Caprichos. Un hombre dormido rodeado de monstruos nocturnos.',
    fotos: ['https://commons.wikimedia.org/wiki/Special:FilePath/Goya_-_Capricho_43.jpg'],
    detalles: { soporte: 'Papel verjurado', tecnica_grabado: 'Aguafuerte y aguatinta', tiraje: 300, num_edicion: '43/300', tinta: 'Tinta negra de imprenta' },
  },
  {
    codigo_inventario: 'GRAB-002',
    nombre: 'Saturno Devorando a su Hijo',
    genero: 'Grabado',
    precio_venta: 190000.0,
    alto: 32.0,
    ancho: 24.0,
    fecha_creacion: new Date('1823-01-01'),
    estado: 'Disponible',
    descripcion: 'Litografía basada en la pintura negra de Goya, imagen perturbadora de mitología griega.',
    fotos: ['https://placehold.co/600x800/1a0a00/white?text=Saturno+Devorando'],
    detalles: { soporte: 'Papel litográfico', tecnica_grabado: 'Litografía', tiraje: 100, num_edicion: '12/100', tinta: 'Tinta litográfica negra' },
  },
];

const acuarelasData = [
  {
    codigo_inventario: 'ACUA-001',
    nombre: 'El Barco Azul',
    genero: 'Acuarela',
    precio_venta: 78000.0,
    alto: 61.0,
    ancho: 76.5,
    fecha_creacion: new Date('1892-01-01'),
    estado: 'Disponible',
    descripcion: 'Acuarela que captura la luminosidad del agua y la serenidad de una embarcación en reposo.',
    fotos: ['https://commons.wikimedia.org/wiki/Special:FilePath/Winslow_Homer_-_The_Blue_Boat.jpg'],
    detalles: { soporte: 'Papel de acuarela de algodón', tecnica: 'Húmedo sobre húmedo', estilos: ['Realismo'], tematicas: ['Marina', 'Paisaje'] },
  },
  {
    codigo_inventario: 'ACUA-002',
    nombre: 'Jardín de Rosas en Provenza',
    genero: 'Acuarela',
    precio_venta: 95000.0,
    alto: 55.0,
    ancho: 70.0,
    fecha_creacion: new Date('1908-01-01'),
    estado: 'Disponible',
    descripcion: 'Vibrante acuarela de un jardín mediterráneo con rosas en plena floración.',
    fotos: ['https://commons.wikimedia.org/wiki/Special:FilePath/John_Singer_Sargent_-_Muddy_Alligators.jpg'],
    detalles: { soporte: 'Papel de acuarela grueso', tecnica: 'Seco sobre seco', estilos: ['Impresionismo'], tematicas: ['Naturaleza', 'Jardín'] },
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

  // Cristalería
  const cristaleriasConRef = [
    asignar(cristaleriasData[0], 'René Lalique'),
    asignar(cristaleriasData[1], 'Émile Gallé'),
  ];

  // Textil
  const textilesConRef = [
    asignar(textilesData[0], 'William Morris'),
    asignar(textilesData[1], 'William Morris'),
  ];

  // Grabado
  const grabadosConRef = [
    asignar(grabadosData[0], 'Francisco Goya'),
    asignar(grabadosData[1], 'Francisco Goya'),
  ];

  // Acuarela
  const acuarelasConRef = [
    asignar(acuarelasData[0], 'John Singer Sargent'),
    asignar(acuarelasData[1], 'John Singer Sargent'),
  ];

  // Insertar usando discriminadores
  const todas = [
    ...pinturasConRef,
    ...esculturasConRef,
    ...fotografiasConRef,
    ...ceramicasConRef,
    ...orfebreriasConRef,
    ...cristaleriasConRef,
    ...textilesConRef,
    ...grabadosConRef,
    ...acuarelasConRef,
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
