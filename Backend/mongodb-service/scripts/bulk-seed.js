// Generador de datos masivos para las 3 BDs
// Inspirado en el dataset del Metropolitan Museum of Art (Kaggle - open access)
// Produce: 60 artistas, 500 obras en MongoDB | 200 usuarios + 300 ventas en MySQL | 2000 eventos + 1000 visitas en Cassandra

require('dotenv').config();
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const cassandra = require(require('path').resolve(__dirname, '../../cassandra-service/node_modules/cassandra-driver'));
const bcrypt = require('bcrypt');
const Artista = require('../models/Artista');
const Obra = require('../models/Obra');

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const now = () => new Date();
const mesesAtras = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
const timer = label => { const t = Date.now(); return () => console.log(`  ${label}: ${Date.now() - t} ms`); };

// ---------------------------------------------
// Datos de artistas (60 nuevos, sin repetir los 12 del seed original)
// ---------------------------------------------
const ARTISTAS = [
  { nombre:'Claude',       apellido:'Monet',           nac:'Francesa',      ganancia:11, generos:['Pintura','Acuarela'],       bio:'Fundador del Impresionismo, maestro de la luz y el color en la naturaleza.',       año:1840 },
  { nombre:'Vincent',      apellido:'van Gogh',         nac:'Holandesa',     ganancia:10, generos:['Pintura'],                  bio:'Postimpresionista de pincelada expresiva y uso audaz del color.',                   año:1853 },
  { nombre:'Pierre-Auguste',apellido:'Renoir',          nac:'Francesa',      ganancia:9,  generos:['Pintura'],                  bio:'Celebrado por sus composiciones luminosas y figuras femeninas.',                    año:1841 },
  { nombre:'Paul',         apellido:'Cézanne',          nac:'Francesa',      ganancia:10, generos:['Pintura','Acuarela'],       bio:'Padre del arte moderno, puente entre Impresionismo y Cubismo.',                    año:1839 },
  { nombre:'Paul',         apellido:'Gauguin',          nac:'Francesa',      ganancia:9,  generos:['Pintura'],                  bio:'Exploró el simbolismo y las culturas primitivas en Polinesia.',                    año:1848 },
  { nombre:'Henri',        apellido:'Matisse',          nac:'Francesa',      ganancia:12, generos:['Pintura'],                  bio:'Líder del Fauvismo, revolucionó el uso del color puro.',                           año:1869 },
  { nombre:'Wassily',      apellido:'Kandinsky',        nac:'Rusa',          ganancia:11, generos:['Pintura','Grabado'],        bio:'Pionero de la abstracción, unió arte y música en sus composiciones.',              año:1866 },
  { nombre:'Edvard',       apellido:'Munch',            nac:'Noruega',       ganancia:10, generos:['Pintura','Grabado'],        bio:'Su obra El Grito es símbolo universal de la angustia existencial.',                año:1863 },
  { nombre:'Gustav',       apellido:'Klimt',            nac:'Austriaca',     ganancia:13, generos:['Pintura'],                  bio:'Máximo exponente de la Secesión Vienesa, famoso por El beso.',                     año:1862 },
  { nombre:'Amedeo',       apellido:'Modigliani',       nac:'Italiana',      ganancia:10, generos:['Pintura','Escultura'],      bio:'Retratos de cuellos alargados y ojos sin pupila, estilo único.',                   año:1884 },
  { nombre:'Marc',         apellido:'Chagall',          nac:'Francesa',      ganancia:9,  generos:['Pintura','Grabado'],        bio:'Poética visual de sueños, folklore judío y amor romántico.',                        año:1887 },
  { nombre:'Joan',         apellido:'Miró',             nac:'Española',      ganancia:10, generos:['Pintura','Escultura'],      bio:'Surrealismo lírico con formas biológicas y colores primarios.',                    año:1893 },
  { nombre:'Jackson',      apellido:'Pollock',          nac:'Estadounidense', ganancia:14, generos:['Pintura'],                 bio:'Expresionismo abstracto, inventó la técnica drip painting.',                       año:1912 },
  { nombre:'Mark',         apellido:'Rothko',           nac:'Estadounidense', ganancia:12, generos:['Pintura'],                 bio:'Campos de color rectangulares que evocan lo sublime y espiritual.',                 año:1903 },
  { nombre:'Edward',       apellido:'Hopper',           nac:'Estadounidense', ganancia:9,  generos:['Pintura','Acuarela'],      bio:'Plasmó la soledad y el silencio de la vida norteamericana.',                        año:1882 },
  { nombre:'Georgia',      apellido:"O'Keeffe",         nac:'Estadounidense', ganancia:11, generos:['Pintura','Acuarela'],      bio:'Flores monumentales y paisajes del desierto de Nuevo México.',                     año:1887 },
  { nombre:'Andy',         apellido:'Warhol',           nac:'Estadounidense', ganancia:13, generos:['Pintura','Grabado'],       bio:'Padre del Pop Art, elevó la cultura popular a categoría artística.',                año:1928 },
  { nombre:'Jean-Michel',  apellido:'Basquiat',         nac:'Estadounidense', ganancia:14, generos:['Pintura'],                 bio:'Neo-expresionismo urbano, combinó palabras e imágenes en su obra.',                 año:1960 },
  { nombre:'Diego',        apellido:'Rivera',           nac:'Mexicana',      ganancia:10, generos:['Pintura'],                  bio:'Muralista mexicano, plasmó la historia y cultura de su país.',                     año:1886 },
  { nombre:'Fernando',     apellido:'Botero',           nac:'Colombiana',    ganancia:11, generos:['Pintura','Escultura'],      bio:'Figuras voluminosas y sensuales en un estilo propio llamado boterismo.',            año:1932 },
  { nombre:'Oswaldo',      apellido:'Guayasamín',       nac:'Ecuatoriana',   ganancia:9,  generos:['Pintura'],                  bio:'Arte indigenista latinoamericano, capturó el sufrimiento del pueblo.',              año:1919 },
  { nombre:'Tamara',       apellido:'de Lempicka',      nac:'Polaca',        ganancia:10, generos:['Pintura'],                  bio:'Art Déco elegante, retratos de la alta sociedad de entreguerras.',                  año:1898 },
  { nombre:'Artemisia',    apellido:'Gentileschi',      nac:'Italiana',      ganancia:10, generos:['Pintura'],                  bio:'Primera mujer en lograr reconocimiento en el Barroco italiano.',                   año:1593 },
  { nombre:'Mary',         apellido:'Cassatt',          nac:'Estadounidense', ganancia:9, generos:['Pintura','Grabado'],        bio:'Única americana en el grupo impresionista de París.',                              año:1844 },
  { nombre:'Gerhard',      apellido:'Richter',          nac:'Alemana',       ganancia:12, generos:['Pintura','Fotografía'],     bio:'Exploró la relación entre pintura y fotografía en el arte contemporáneo.',          año:1932 },
  { nombre:'Constantin',   apellido:'Brancusi',         nac:'Rumana',        ganancia:11, generos:['Escultura'],                bio:'Escultura abstracta que captura la esencia de las formas puras.',                  año:1876 },
  { nombre:'Alberto',      apellido:'Giacometti',       nac:'Suiza',         ganancia:12, generos:['Escultura'],                bio:'Figuras alargadas que expresan la soledad y fragilidad humana.',                   año:1901 },
  { nombre:'Alexander',    apellido:'Calder',           nac:'Estadounidense', ganancia:10, generos:['Escultura'],               bio:'Inventor del móvil, escultura cinética en equilibrio constante.',                  año:1898 },
  { nombre:'Louise',       apellido:'Bourgeois',        nac:'Francesa',      ganancia:11, generos:['Escultura'],                bio:'Esculturas monumentales que exploran la memoria, el cuerpo y la familia.',          año:1911 },
  { nombre:'Barbara',      apellido:'Hepworth',         nac:'Británica',     ganancia:10, generos:['Escultura'],                bio:'Pionera de la escultura abstracta en Gran Bretaña.',                               año:1903 },
  { nombre:'Henry',        apellido:'Moore',            nac:'Británica',     ganancia:10, generos:['Escultura'],                bio:'Figuras reclinadas en bronce y piedra, símbolo de la escultura moderna.',           año:1898 },
  { nombre:'Eduardo',      apellido:'Chillida',         nac:'Española',      ganancia:9,  generos:['Escultura'],                bio:'Escultura monumental en acero y piedra, exploró el espacio y el vacío.',            año:1924 },
  { nombre:'Isamu',        apellido:'Noguchi',          nac:'Estadounidense', ganancia:10, generos:['Escultura','Cerámica'],    bio:'Integró escultura, diseño y arquitectura paisajista.',                             año:1904 },
  { nombre:'Henri',        apellido:'Cartier-Bresson',  nac:'Francesa',      ganancia:10, generos:['Fotografía'],               bio:'Padre del fotoperiodismo y creador del concepto del instante decisivo.',            año:1908 },
  { nombre:'Diane',        apellido:'Arbus',            nac:'Estadounidense', ganancia:9,  generos:['Fotografía'],              bio:'Retratos íntimos de personas al margen de la sociedad.',                           año:1923 },
  { nombre:'Robert',       apellido:'Mapplethorpe',     nac:'Estadounidense', ganancia:10, generos:['Fotografía'],              bio:'Fotografías en blanco y negro de alta precisión técnica.',                         año:1946 },
  { nombre:'Cindy',        apellido:'Sherman',          nac:'Estadounidense', ganancia:11, generos:['Fotografía'],              bio:'Se retrata a sí misma en personajes ficticios, cuestiona la identidad.',            año:1954 },
  { nombre:'Sebastião',    apellido:'Salgado',          nac:'Brasileña',     ganancia:10, generos:['Fotografía'],               bio:'Documentalista de migraciones, trabajadores y naturaleza salvaje.',                 año:1944 },
  { nombre:'Dorothea',     apellido:'Lange',            nac:'Estadounidense', ganancia:9,  generos:['Fotografía'],              bio:'Fotógrafa de la Gran Depresión, su obra influyó en el fotoperiodismo social.',     año:1895 },
  { nombre:'Alfred',       apellido:'Stieglitz',        nac:'Estadounidense', ganancia:9,  generos:['Fotografía'],              bio:'Pionero de la fotografía artística, galería 291 en Nueva York.',                   año:1864 },
  { nombre:'Lucie',        apellido:'Rie',              nac:'Británica',     ganancia:8,  generos:['Cerámica'],                 bio:'Cuencos y vasijas de porcelana de refinamiento extraordinario.',                   año:1902 },
  { nombre:'Shoji',        apellido:'Hamada',           nac:'Japonesa',      ganancia:7,  generos:['Cerámica'],                 bio:'Maestro de la cerámica mingei, elevó las artes populares japonesas.',               año:1894 },
  { nombre:'Peter',        apellido:'Voulkos',          nac:'Estadounidense', ganancia:8,  generos:['Cerámica','Escultura'],    bio:'Introdujo el expresionismo abstracto en la cerámica norteamericana.',              año:1924 },
  { nombre:'Hans',         apellido:'Coper',            nac:'Alemana',       ganancia:8,  generos:['Cerámica'],                 bio:'Formas escultóricas en cerámica de gran austeridad formal.',                       año:1920 },
  { nombre:'Peter Carl',   apellido:'Fabergé',          nac:'Rusa',          ganancia:15, generos:['Orfebrería'],               bio:'Joyero del Zar, creador de los célebres huevos imperiales.',                       año:1846 },
  { nombre:'Georges',      apellido:'Fouquet',          nac:'Francesa',      ganancia:12, generos:['Orfebrería','Cristalería'], bio:'Joyero Art Nouveau, colaboró con Alphonse Mucha.',                                año:1862 },
  { nombre:'Carlo',        apellido:'Giuliano',         nac:'Italiana',      ganancia:11, generos:['Orfebrería'],               bio:'Orfebre victoriano especializado en joyas de inspiración renacentista.',            año:1831 },
  { nombre:'Louis Comfort',apellido:'Tiffany',          nac:'Estadounidense', ganancia:12, generos:['Cristalería'],             bio:'Creador del icónico vidrio Favrile y las lámparas Tiffany.',                       año:1848 },
  { nombre:'Frederick',    apellido:'Carder',           nac:'Británica',     ganancia:9,  generos:['Cristalería'],              bio:'Fundador de Steuben Glass, maestro del vidrio decorativo.',                        año:1863 },
  { nombre:'Maurice',      apellido:'Marinot',          nac:'Francesa',      ganancia:10, generos:['Cristalería'],              bio:'Pionero del vidrio artístico moderno, técnicas de fundido y grabado.',              año:1882 },
  { nombre:'Anni',         apellido:'Albers',           nac:'Alemana',       ganancia:9,  generos:['Textil'],                   bio:'Maestra de la Bauhaus, elevó el textil a la categoría de arte.',                   año:1899 },
  { nombre:'Lenore',       apellido:'Tawney',           nac:'Estadounidense', ganancia:8,  generos:['Textil'],                  bio:'Pionera del fiber art, integró textiles en el espacio arquitectónico.',             año:1907 },
  { nombre:'Sheila',       apellido:'Hicks',            nac:'Estadounidense', ganancia:8,  generos:['Textil'],                  bio:'Exploró el lenguaje universal de las fibras en instalaciones monumentales.',        año:1934 },
  { nombre:'Albrecht',     apellido:'Dürer',            nac:'Alemana',       ganancia:11, generos:['Grabado','Pintura'],        bio:'Maestro renacentista del grabado en madera y buril.',                              año:1471 },
  { nombre:'Katsushika',   apellido:'Hokusai',          nac:'Japonesa',      ganancia:10, generos:['Grabado'],                  bio:'Autor de La gran ola, maestro de la xilografía ukiyo-e.',                          año:1760 },
  { nombre:'Käthe',        apellido:'Kollwitz',         nac:'Alemana',       ganancia:9,  generos:['Grabado','Escultura'],      bio:'Grabados expresionistas sobre la guerra, la pobreza y el luto.',                  año:1867 },
  { nombre:'Henri',        apellido:'Toulouse-Lautrec', nac:'Francesa',      ganancia:10, generos:['Grabado','Pintura'],        bio:'Carteles y litografías del cabaret montmartrés, Moulin Rouge.',                    año:1864 },
  { nombre:'J.M.W.',       apellido:'Turner',           nac:'Británica',     ganancia:10, generos:['Acuarela','Pintura'],       bio:'Paisajes románticos de luz y atmósfera, precursor de la abstracción.',             año:1775 },
  { nombre:'Paul',         apellido:'Signac',           nac:'Francesa',      ganancia:9,  generos:['Acuarela','Pintura'],       bio:'Puntillismo y Neo-impresionismo, marinero y paisajista del Mediterráneo.',         año:1863 },
  { nombre:'Winslow',      apellido:'Homer',            nac:'Estadounidense', ganancia:9,  generos:['Acuarela','Pintura'],       bio:'Marino y naturaleza norteamericana con maestría en acuarela.',                    año:1836 },
  { nombre:'Yayoi',        apellido:'Kusama',           nac:'Japonesa',      ganancia:13, generos:['Pintura','Escultura'],      bio:'Arte obsesivo de puntos y reflejos infinitos, icono del arte contemporáneo.',      año:1929 },
  { nombre:'Roberto',      apellido:'Matta',            nac:'Chilena',       ganancia:10, generos:['Pintura'],                  bio:'Surrealismo abstracto, universos psíquicos de gran formato.',                      año:1911 },
];

// ---------------------------------------------
// Vocabulario para géneros de obras
// ---------------------------------------------
const V = {
  adj:    ['Gran','Pequeña','Eterna','Fugaz','Oscura','Luminosa','Silenciosa','Violenta','Melancólica','Serena','Fragmentada','Densa'],
  suj:    ['Figura','Composición','Retrato','Estudio','Variación','Memoria','Forma','Sueño','Visión','Fragmento','Esencia','Presencia'],
  prep:   ['en','sobre','con','desde','ante','bajo'],
  ctx:    ['azul','negro','rojo','blanco','la sombra','la luz','el vacío','el tiempo','el silencio','la distancia','el horizonte','lo efímero'],
  estilo: ['Impresionismo','Cubismo','Surrealismo','Expresionismo','Abstraccionismo','Realismo','Barroco','Art Nouveau','Pop Art','Minimalismo'],
  tema:   ['Retrato','Paisaje','Marina','Naturaleza muerta','Figura humana','Abstracto','Histórica','Mitológica','Religiosa','Costumbrista'],
  soporte:['Lienzo','Tabla','Papel','Madera','Metal','Cartón entelado'],
  matEsc: ['Bronce','Mármol','Madera','Acero Corten','Hierro','Alabastro','Terracota','Resina'],
  tecEsc: ['Fundición a la cera perdida','Talla directa','Modelado en arcilla','Soldadura','Ensamblaje'],
  tipoVid:['Soplado a boca','Camafeo multicapa','Opalescente','Prensado en molde','Grabado al ácido'],
  tecVid: ['Pâte de verre','Grabado al ácido','Fusión en horno','Molde perdido','Soplado libre'],
  fibra:  ['Lana','Seda','Algodón','Lino','Yute','Seda y oro','Fibra de agave'],
  tecTex: ['Tapicería jacquard','Bordado a aguja','Macramé','Batik','Reserva de cera'],
  tecGrab:['Aguafuerte','Litografía','Xilografía','Serigrafía','Aguatinta','Punta seca'],
  sGrab:  ['Papel verjurado','Papel japonés','Papel de algodón','Papel Arches','Papel Fabriano'],
  tintas: ['Tinta negra','Tinta sepia','Tinta al óleo','Tinta litográfica'],
  tecFoto:['Blanco y negro','Gelatin silver','Color análogo','Cibachrome','Platino-paladio'],
  cam:    ['Leica M6','Hasselblad 500C','Mamiya RZ67','Linhof 4x5','Canon F-1','Nikon F3'],
  arcil:  ['Gres','Porcelana','Terracota','Barro rojo','Raku'],
  tecCer: ['Torno alfarero','Modelado a mano','Colada en molde','Pellizco y planchas'],
  esmal:  ['Celadón','Reducción cobre','Cristalino','Raku','Shino','Matte feldespático'],
  metal:  ['Oro','Plata','Cobre','Bronce','Platino','Oro rosa','Estaño'],
  pieza:  ['Collar','Brazalete','Anillo','Copa ceremonial','Cáliz','Bandeja','Broche','Pendientes','Diadema'],
  tecAcu: ['Húmedo sobre húmedo','Seco sobre seco','Aguada','Reserva de blanco con cera'],
  sAcu:   ['Papel de algodón 300g','Papel prensado en frío','Papel Fabriano 200g','Papel Arches'],
};

function titulo() {
  const pats = [
    () => `${pick(V.adj)} ${pick(V.suj)}`,
    () => `${pick(V.suj)} ${pick(V.prep)} ${pick(V.ctx)}`,
    () => `${pick(V.adj)} ${pick(V.suj)} ${pick(V.prep)} ${pick(V.ctx)}`,
    () => `Sin título No. ${randInt(1,999)}`,
    () => `${pick(V.tema)} ${randInt(1900,2010)}`,
  ];
  return pick(pats)();
}

function fechaObra() {
  const y = randInt(1850, 2020);
  return new Date(`${y}-01-01`);
}

function fotoPlaceholder(genero) {
  const colores = {
    'Pintura':'4a235a','Escultura':'4a4a4a','Fotografía':'1a1a2e',
    'Cerámica':'7d4e18','Orfebrería':'c49a0a','Cristalería':'1a4a6e',
    'Textil':'2e5a1e','Grabado':'2a2a2a','Acuarela':'1e3a6e',
  };
  const col = colores[genero] || '333333';
  return [`https://placehold.co/600x600/${col}/white?text=${encodeURIComponent(genero)}`];
}

function codigoInventario(genero, n) {
  const p = { Pintura:'BK-PIN',Escultura:'BK-ESC',Fotografía:'BK-FOT',Cerámica:'BK-CER',
               Orfebrería:'BK-ORF',Cristalería:'BK-CRI',Textil:'BK-TEX',Grabado:'BK-GRA',Acuarela:'BK-ACU' };
  return `${p[genero] || 'BK-OBR'}-${String(n).padStart(5,'0')}`;
}

// ---------------------------------------------
// Generadores de detalles por género
// ---------------------------------------------
const detalles = {
  Pintura:    () => ({ soporte: pick(V.soporte), estilos: shuffle(V.estilo).slice(0,randInt(1,3)), tematicas: shuffle(V.tema).slice(0,randInt(1,2)) }),
  Escultura:  () => ({ peso: randFloat(5,500), profundidad: randFloat(10,120), tipo_escultura: pick(['Bulto redondo','Altorrelieve','Bajorrelieve','Obra cinética']), materiales: shuffle(V.matEsc).slice(0,randInt(1,3)), tecnicas: shuffle(V.tecEsc).slice(0,randInt(1,2)) }),
  Fotografía: () => ({ tiraje: randInt(1,50), obturacion: pick(['1/30','1/60','1/125','1/250','1/500','1s','4s']), apertura: pick(['f/1.4','f/2','f/2.8','f/4','f/5.6','f/8','f/11']), iso: pick([25,50,100,200,400,800,1600]), resolucion: pick(['200dpi','300dpi','600dpi']), fecha_captura: new Date(randInt(1920,2020),randInt(0,11),randInt(1,28)), impresion: pick(['Gelatin silver','Cibachrome','Platino-paladio','Papel baritado']), camara: pick(V.cam), tecnica_fotografica: pick(V.tecFoto) }),
  Cerámica:   () => ({ profundidad: randFloat(5,40), diametro: randFloat(8,60), funcionalidad: pick(['Decorativo','Vajilla','Vase','Escultura','Ritual']), coccion: pick(['Oxidación 1280°C','Reducción 1300°C','Raku','Baja temperatura 1050°C']), arcilla: pick(V.arcil), modelado: pick(V.tecCer), esmaltado: pick(V.esmal) }),
  Orfebrería: () => ({ profundidad: randFloat(0.5,15), diametro: randFloat(0.5,20), peso: randFloat(10,800), pieza: pick(V.pieza), metal_predominante: pick(V.metal), metales: shuffle(V.metal).slice(0,randInt(1,3)) }),
  Cristalería:() => ({ tipo_vidrio: pick(V.tipoVid), tecnica: pick(V.tecVid), transparencia: pick(['Transparente','Translúcido','Opaco']), color: pick(['Azul cobalto','Rojo rubí','Verde bosque','Ámbar','Incoloro','Negro azabache','Blanco opalino']), profundidad: randFloat(5,35), diametro: randFloat(6,30), peso: randFloat(0.3,3) }),
  Textil:     () => ({ tipo_tejido: pick(['Tapiz jacquard','Bordado en seda','Macramé','Tejido a telar','Batik','Tapiz gobelin']), fibra: shuffle(V.fibra).slice(0,randInt(1,3)), tecnica: pick(V.tecTex), urdimbre: pick(['Algodón crudo','Lino natural','Seda cruda']), trama: pick(['Lana teñida','Seda de colores','Hilo de oro','Fibra sintética']) }),
  Grabado:    () => ({ soporte: pick(V.sGrab), tecnica_grabado: pick(V.tecGrab), tiraje: randInt(10,500), num_edicion: `${randInt(1,200)}/${randInt(200,500)}`, tinta: pick(V.tintas) }),
  Acuarela:   () => ({ soporte: pick(V.sAcu), tecnica: pick(V.tecAcu), estilos: shuffle(V.estilo).slice(0,randInt(1,2)), tematicas: shuffle(V.tema).slice(0,randInt(1,2)) }),
};

// ---------------------------------------------
// Distribución de obras por género (total 500)
// ---------------------------------------------
const DIST = [
  { genero:'Pintura',    n:150 }, { genero:'Escultura',   n:70 },
  { genero:'Fotografía', n:60  }, { genero:'Cerámica',    n:55 },
  { genero:'Orfebrería', n:45  }, { genero:'Cristalería', n:40 },
  { genero:'Textil',     n:35  }, { genero:'Grabado',     n:35 },
  { genero:'Acuarela',   n:10  },
];

// ---------------------------------------------
// Seed MongoDB
// ---------------------------------------------
async function seedMongoDB() {
  console.log('\n[MongoDB]');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/museo_catalogo');

  const stopArt = timer('  Insertar 60 artistas');
  const artistasDocs = [];
  for (const a of ARTISTAS) {
    let doc = await Artista.findOne({ nombre: a.nombre, apellido: a.apellido });
    if (!doc) {
      doc = await Artista.create({
        nombre: a.nombre, apellido: a.apellido,
        biografia: a.bio,
        fecha_nacimiento: new Date(`${a.año}-06-15`),
        nacionalidad: a.nac,
        porcentaje_ganancia: a.ganancia,
        generos_artisticos: a.generos,
        fotos: [`https://placehold.co/300x300/1e293b/white?text=${encodeURIComponent(a.apellido)}`],
      });
    }
    artistasDocs.push({ doc, generos: a.generos });
  }
  stopArt();
  console.log(`    → ${artistasDocs.length} artistas procesados`);

  // Mapa género → artistas compatibles
  const generoArtMap = {};
  for (const { doc, generos } of artistasDocs) {
    for (const g of generos) {
      if (!generoArtMap[g]) generoArtMap[g] = [];
      generoArtMap[g].push(doc);
    }
  }

  const stopObras = timer('  Insertar 500 obras');
  const obraIds = [];
  let counter = 1;

  for (const { genero, n } of DIST) {
    const artistas = generoArtMap[genero] || artistasDocs.map(a => a.doc);
    const Model = mongoose.model(genero);

    for (let i = 0; i < n; i++) {
      const artista = pick(artistas);
      const codigo = codigoInventario(genero, counter++);

      const existe = await Obra.findOne({ codigo_inventario: codigo });
      if (existe) { obraIds.push({ _id: existe._id, nombre: existe.nombre, precio: existe.precio_venta }); continue; }

      const doc = await Model.create({
        codigo_inventario: codigo,
        nombre: titulo(),
        artista_id: artista._id,
        artista: { nombre: artista.nombre, apellido: artista.apellido, nacionalidad: artista.nacionalidad },
        genero,
        precio_venta: randFloat(1000, 950000),
        alto: randFloat(10, 300), ancho: randFloat(10, 400),
        fecha_creacion: fechaObra(),
        estado: pick(['Disponible','Disponible','Disponible','Vendida','Reservada']),
        fotos: fotoPlaceholder(genero),
        descripcion: `${genero} de ${artista.nombre} ${artista.apellido}. ${pick(V.estilo)}, ${pick(V.tema)}.`,
        detalles: detalles[genero](),
      });
      obraIds.push({ _id: doc._id, nombre: doc.nombre, precio: doc.precio_venta });
    }
  }
  stopObras();
  console.log(`    → ${obraIds.length} obras procesadas`);
  return obraIds;
}

// ---------------------------------------------
// Seed MySQL
// ---------------------------------------------
async function seedMySQL(obraIds) {
  console.log('\n[MySQL]');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Museo',
  });

  const HASH = await bcrypt.hash('BulkUser2026!', 6);
  const nombres = ['María','Carlos','Ana','Jorge','Laura','Pedro','Sofía','Luis','Elena','Pablo','Carmen','Miguel','Isabel','Andrés','Valentina','Ricardo','Natalia','Felipe','Claudia','Alejandro','Diego','Gabriela','Fernanda','Sebastián','Camila','Rodrigo','Paola','Hernán','Lucía','Mateo'];
  const apellidos = ['García','Martínez','López','González','Pérez','Rodríguez','Sánchez','Jiménez','Torres','Flores','Morales','Reyes','Vargas','Cruz','Mendoza','Romero','Herrera','Castillo','Ortega','Ramos','Vega','Molina','Silva','Guerrero','Delgado','Gómez','Aguilar','Muñoz','Rojas','Peña'];
  const dominios = ['gmail.com','hotmail.com','yahoo.com','outlook.com','icloud.com','live.com'];

  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
  const tarjetaVisa = () => '4' + Array.from({length:15}, () => randInt(0,9)).join('');
  const tarjetaMC   = () => `5${randInt(1,5)}` + Array.from({length:14}, () => randInt(0,9)).join('');
  const expiracion  = () => { const y = randInt(2026,2030); return `${y}-${String(randInt(1,12)).padStart(2,'0')}-01`; };

  const emailUsados = new Set();
  const emailUnico = (nombre, apellido) => {
    const base = `${norm(nombre)}.${norm(apellido)}`;
    for (let n = randInt(70,99); n <= 99; n++) {
      const e = `${base}${n}@${pick(dominios)}`;
      if (!emailUsados.has(e)) { emailUsados.add(e); return e; }
    }
    return `${base}${Date.now() % 10000}@gmail.com`;
  };

  const stopUs = timer('  Insertar 200 usuarios');
  const userIds = [];
  for (let i = 0; i < 200; i++) {
    const nombre = pick(nombres), apellido = pick(apellidos);
    const email = emailUnico(nombre, apellido);
    const [ex] = await conn.execute('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
    if (ex.length > 0) { userIds.push(ex[0].usuario_id); continue; }
    const [r] = await conn.execute(
      'INSERT INTO Usuario (email, password, nombre, apellido, tipo) VALUES (?,?,?,?,?)',
      [email, HASH, nombre, apellido, 'miembro']
    );
    const uid = r.insertId;
    userIds.push(uid);
    const esVisa = Math.random() < 0.6;
    await conn.execute(
      'INSERT INTO Miembro (usuario_id, tarjeta_numero, tarjeta_nombre, tarjeta_expiracion, codigo_seguridad) VALUES (?,?,?,?,?)',
      [uid, esVisa ? tarjetaVisa() : tarjetaMC(), `${nombre} ${apellido}`, expiracion(), String(randInt(100,999))]
    );
  }
  stopUs();
  console.log(`    → ${userIds.length} usuarios procesados`);

  const vendidas = obraIds.slice(0, 300);
  const stopVen = timer('  Insertar 300 ventas');
  for (let i = 0; i < 300; i++) {
    const o = vendidas[i];
    const uid = pick(userIds);
    const precio = typeof o.precio === 'object' ? parseFloat(o.precio.toString()) : parseFloat(o.precio) || 1000;
    const fecha = mesesAtras(randInt(0, 24));
    const [ex] = await conn.execute('SELECT venta_id FROM Venta WHERE obra_id = ? LIMIT 1', [o._id.toString()]);
    if (ex.length > 0) continue;
    await conn.execute(
      'INSERT INTO Venta (obra_id, comprador_id, obra_nombre, artista_nombre, precio_venta, porcentaje_ganancia, fecha_reserva, fecha_venta, estado) VALUES (?,?,?,?,?,?,?,?,?)',
      [o._id.toString(), uid, o.nombre.substring(0,250), 'Artista Bulk', precio, 8, fecha, fecha, 'vendida']
    );
  }
  stopVen();
  console.log(`    → hasta 300 ventas insertadas`);
  await conn.end();
}

// ---------------------------------------------
// Seed Cassandra
// ---------------------------------------------
async function seedCassandra(obraIds) {
  console.log('\n[Cassandra]');
  const client = new cassandra.Client({
    contactPoints: [(process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1')],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: 'museo_auditoria',
  });
  await client.connect();

  const nombresEv  = ['maria','carlos','ana','jorge','laura','pedro','sofia','luis','elena','pablo'];
  const apellidosEv = ['garcia','martinez','lopez','gonzalez','perez','rodriguez','sanchez','torres'];
  const dominiosEv  = ['gmail.com','hotmail.com','yahoo.com','outlook.com'];
  const usuarios = Array.from({length:50}, () =>
    `${pick(nombresEv)}.${pick(apellidosEv)}${randInt(70,99)}@${pick(dominiosEv)}`
  );
  const ips = ['192.168.1.10','10.0.0.5','172.16.0.1','192.168.0.100','10.10.0.50'];
  const tablas = ['eventos_login','eventos_compra','eventos_admin','eventos_sistema'];
  const tiposPorTabla = {
    eventos_login:   ['login_exitoso','login_exitoso','login_exitoso','login_fallido'],
    eventos_compra:  ['solicitud_compra','reserva_creada','compra_aceptada','compra_rechazada','reserva_cancelada'],
    eventos_admin:   ['cambio_rol','modificar_obra','eliminar_obra','crear_usuario'],
    eventos_sistema: ['error_sistema','error_sistema','error_conexion','timeout'],
  };
  const severidades = { eventos_login:'INFO', eventos_compra:'INFO', eventos_admin:'WARN', eventos_sistema:'ERROR' };

  const stopEv = timer('  Insertar 2000 eventos');
  for (let i = 0; i < 2000; i++) {
    const tabla = pick(tablas);
    const tipo = pick(tiposPorTabla[tabla]);
    const ts = new Date(Date.now() - randInt(0, 90) * 86400000);
    const mes = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}`;
    await client.execute(
      `INSERT INTO ${tabla} (mes, timestamp, id, tipo_evento, usuario, severidad, metadata, ip) VALUES (?,?,?,?,?,?,?,?)`,
      [mes, ts, cassandra.types.TimeUuid.now(), tipo, pick(usuarios), severidades[tabla], '{}', pick(ips)],
      { prepare: true }
    );
  }
  stopEv();
  console.log('    → 2000 eventos insertados');

  const stopVis = timer('  Insertar 1000 visitas');
  const muestra = shuffle(obraIds).slice(0, Math.min(100, obraIds.length));
  for (let i = 0; i < 1000; i++) {
    const o = pick(muestra);
    const hoy = new Date(Date.now() - randInt(0,30)*86400000).toISOString().slice(0,10);
    await Promise.all([
      client.execute('UPDATE visitas_obra SET total = total + 1 WHERE obra_id = ? AND fecha = ?', [o._id.toString(), hoy], { prepare:true }),
      client.execute('UPDATE visitas_totales SET total = total + 1 WHERE obra_id = ?', [o._id.toString()], { prepare:true }),
    ]);
  }
  stopVis();
  console.log('    → 1000 visitas insertadas');
  await client.shutdown();
}

// ---------------------------------------------
// Main
// ---------------------------------------------
async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  BULK SEED - Museo de Arte       ║');
  console.log('║  Basado en estructura MET Kaggle  ║');
  console.log('╚══════════════════════════════════╝');
  const total = timer('TOTAL');

  try {
    const obraIds = await seedMongoDB();
    await seedMySQL(obraIds);
    await seedCassandra(obraIds);
  } catch (e) {
    console.error('\nError:', e.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n----------------------------------');
  total();
  console.log('Bulk seed completado.');
}

main();
