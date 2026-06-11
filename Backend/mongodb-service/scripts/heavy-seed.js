// Heavy seed - carga masiva para benchmark real
// MongoDB: +5000 obras  |  MySQL: +3000 usuarios +15000 ventas  |  Cassandra: +100000 eventos +30000 visitas
// Usa insertMany / batch SQL para mayor velocidad

require('dotenv').config();
const mongoose  = require('mongoose');
const mysql     = require('mysql2/promise');
const cassandra = require(require('path').resolve(__dirname, '../../cassandra-service/node_modules/cassandra-driver'));
const Obra      = require('../models/Obra');
const Artista   = require('../models/Artista');

const pick    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const norm    = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');
const timer   = label => { const t = Date.now(); return () => console.log(`  ${label}: ${((Date.now()-t)/1000).toFixed(1)}s`); };

// -- Vocabulario ------------------------------------------------
const V = {
  adj:    ['Gran','Pequena','Eterna','Fugaz','Oscura','Luminosa','Silenciosa','Violenta','Melancolica','Serena','Fragmentada','Densa','Vasta','Intima'],
  suj:    ['Figura','Composicion','Retrato','Estudio','Variacion','Memoria','Forma','Sueno','Vision','Fragmento','Esencia','Presencia','Contorno','Latido'],
  prep:   ['en','sobre','con','desde','ante','bajo','tras'],
  ctx:    ['azul','negro','rojo','blanco','la sombra','la luz','el vacio','el tiempo','el silencio','la distancia','lo efimero','el horizonte'],
  estilo: ['Impresionismo','Cubismo','Surrealismo','Expresionismo','Abstraccionismo','Realismo','Barroco','Pop Art','Minimalismo'],
  tema:   ['Retrato','Paisaje','Marina','Naturaleza muerta','Figura humana','Abstracto','Historica','Mitologica'],
  soporte:['Lienzo','Tabla','Papel','Madera','Metal','Carton entelado'],
  matEsc: ['Bronce','Marmol','Madera','Acero Corten','Hierro','Alabastro','Terracota'],
  tecEsc: ['Fundicion a la cera perdida','Talla directa','Modelado en arcilla','Soldadura'],
  tecFoto:['Blanco y negro','Gelatin silver','Color analogo','Cibachrome','Platino-paladio'],
  cam:    ['Leica M6','Hasselblad 500C','Mamiya RZ67','Linhof 4x5','Canon F-1'],
  arcil:  ['Gres','Porcelana','Terracota','Barro rojo','Raku'],
  tecCer: ['Torno alfarero','Modelado a mano','Colada en molde'],
  metal:  ['Oro','Plata','Cobre','Bronce','Platino','Oro rosa'],
  pieza:  ['Collar','Brazalete','Anillo','Copa ceremonial','Bandeja','Broche'],
  tipoVid:['Soplado a boca','Camafeo multicapa','Opalescente','Grabado al acido'],
  tecVid: ['Pate de verre','Grabado al acido','Fusion en horno'],
  fibra:  ['Lana','Seda','Algodon','Lino','Yute','Seda y oro'],
  tecTex: ['Tapiceria jacquard','Bordado a aguja','Macrame','Batik'],
  tecGrab:['Aguafuerte','Litografia','Xilografia','Serigrafia','Aguatinta'],
  sGrab:  ['Papel verjurado','Papel japones','Papel Arches'],
  tintas: ['Tinta negra','Tinta sepia','Tinta al oleo'],
  tecAcu: ['Humedo sobre humedo','Seco sobre seco','Aguada'],
  sAcu:   ['Papel de algodon 300g','Papel Arches','Papel Fabriano 200g'],
};

const titulo = () => {
  const pats = [
    () => `${pick(V.adj)} ${pick(V.suj)}`,
    () => `${pick(V.suj)} ${pick(V.prep)} ${pick(V.ctx)}`,
    () => `${pick(V.adj)} ${pick(V.suj)} ${pick(V.prep)} ${pick(V.ctx)}`,
    () => `Sin titulo No. ${randInt(1,9999)}`,
    () => `${pick(V.tema)} ${randInt(1800,2023)}`,
    () => `Estudio ${randInt(1,999)} - ${pick(V.ctx)}`,
  ];
  return pick(pats)();
};

const fechaObra = () => new Date(`${randInt(1800,2023)}-01-01`);

const codigoHeavy = (genero, n) => {
  const p = { 'Pintura':'HV-PIN','Escultura':'HV-ESC','Fotografía':'HV-FOT','Cerámica':'HV-CER',
              'Orfebrería':'HV-ORF','Cristalería':'HV-CRI','Textil':'HV-TEX','Grabado':'HV-GRA','Acuarela':'HV-ACU' };
  return `${p[genero] || 'HV-OBR'}-${String(n).padStart(6,'0')}`;
};

const fotoPlaceholder = genero => {
  const col = { 'Pintura':'4a235a','Escultura':'4a4a4a','Fotografía':'1a1a2e','Cerámica':'7d4e18',
                'Orfebrería':'c49a0a','Cristalería':'1a4a6e','Textil':'2e5a1e','Grabado':'2a2a2a','Acuarela':'1e3a6e' };
  return [`https://placehold.co/600x600/${col[genero]||'333333'}/white?text=${encodeURIComponent(genero)}`];
};

const detalles = {
  'Pintura':     () => ({ soporte: pick(V.soporte), estilos: shuffle(V.estilo).slice(0,2), tematicas: [pick(V.tema)] }),
  'Escultura':   () => ({ peso: randFloat(5,500), profundidad: randFloat(10,120), tipo_escultura: pick(['Bulto redondo','Altorrelieve','Bajorrelieve']), materiales: shuffle(V.matEsc).slice(0,2), tecnicas: [pick(V.tecEsc)] }),
  'Fotografía':  () => ({ tiraje: randInt(1,50), obturacion: pick(['1/30','1/125','1/500','1s']), apertura: pick(['f/2.8','f/4','f/8']), iso: pick([100,200,400,800]), fecha_captura: new Date(randInt(1920,2023),randInt(0,11),1), impresion: pick(['Gelatin silver','Cibachrome']), camara: pick(V.cam), tecnica_fotografica: pick(V.tecFoto) }),
  'Cerámica':    () => ({ profundidad: randFloat(5,40), diametro: randFloat(8,60), funcionalidad: pick(['Decorativo','Vajilla','Escultura']), coccion: pick(['Oxidacion 1280C','Reduccion 1300C','Raku']), arcilla: pick(V.arcil), modelado: pick(V.tecCer), esmaltado: pick(['Celadon','Cristalino','Raku']) }),
  'Orfebrería':  () => ({ profundidad: randFloat(0.5,15), diametro: randFloat(0.5,20), peso: randFloat(10,800), pieza: pick(V.pieza), metal_predominante: pick(V.metal), metales: shuffle(V.metal).slice(0,2) }),
  'Cristalería': () => ({ tipo_vidrio: pick(V.tipoVid), tecnica: pick(V.tecVid), transparencia: pick(['Transparente','Translucido','Opaco']), color: pick(['Azul cobalto','Rojo rubi','Verde bosque','Ambar','Incoloro']), profundidad: randFloat(5,35), diametro: randFloat(6,30), peso: randFloat(0.3,3) }),
  'Textil':      () => ({ tipo_tejido: pick(['Tapiz jacquard','Bordado en seda','Macrame','Batik']), fibra: shuffle(V.fibra).slice(0,2), tecnica: pick(V.tecTex), urdimbre: pick(['Algodon crudo','Lino natural']), trama: pick(['Lana tenida','Seda de colores','Hilo de oro']) }),
  'Grabado':     () => ({ soporte: pick(V.sGrab), tecnica_grabado: pick(V.tecGrab), tiraje: randInt(10,500), num_edicion: `${randInt(1,200)}/${randInt(200,500)}`, tinta: pick(V.tintas) }),
  'Acuarela':    () => ({ soporte: pick(V.sAcu), tecnica: pick(V.tecAcu), estilos: [pick(V.estilo)], tematicas: [pick(V.tema)] }),
};

// Distribucion heavy: ~5000 obras nuevas
const DIST = [
  { genero:'Pintura',     n:1500 },
  { genero:'Escultura',   n:700  },
  { genero:'Fotografía',  n:600  },
  { genero:'Cerámica',    n:550  },
  { genero:'Orfebrería',  n:450  },
  { genero:'Cristalería', n:400  },
  { genero:'Textil',      n:350  },
  { genero:'Grabado',     n:350  },
  { genero:'Acuarela',    n:100  },
];

// ---------------------------------------------
// MongoDB - 5000 obras con insertMany por lotes
// ---------------------------------------------
async function seedMongoDB() {
  console.log('\n[MongoDB] Insertando ~5000 obras...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/museo_catalogo');

  const artistas = await Artista.find({}, '_id nombre apellido nacionalidad').lean();
  if (!artistas.length) { console.log('  ERROR: No hay artistas. Ejecuta bulk-seed.js primero.'); return []; }

  const generoArtMap = {};
  // Llenar mapa genero→artistas (simplificado: todos los artistas para todos los generos)
  for (const g of DIST.map(d => d.genero)) generoArtMap[g] = artistas;

  const LOTE = 200; // documentos por insertMany
  const obraIds = [];
  let counter = 10000;

  const stop = timer('Insertar obras');
  for (const { genero, n } of DIST) {
    const Model    = mongoose.model(genero);
    const arts     = generoArtMap[genero];
    let insertados = 0;

    while (insertados < n) {
      const tamLote = Math.min(LOTE, n - insertados);
      const lote    = [];

      for (let i = 0; i < tamLote; i++) {
        const art    = pick(arts);
        const codigo = codigoHeavy(genero, counter++);
        lote.push({
          codigo_inventario: codigo,
          nombre:            titulo(),
          artista_id:        art._id,
          artista:           { nombre: art.nombre, apellido: art.apellido, nacionalidad: art.nacionalidad },
          genero,
          precio_venta:      randFloat(500, 2500000),
          alto:              randFloat(5, 400),
          ancho:             randFloat(5, 500),
          fecha_creacion:    fechaObra(),
          estado:            pick(['Disponible','Disponible','Disponible','Vendida','Reservada']),
          fotos:             fotoPlaceholder(genero),
          descripcion:       `${genero} de ${art.nombre} ${art.apellido}. ${pick(V.estilo)}.`,
          detalles:          detalles[genero](),
        });
      }

      try {
        const docs = await Model.insertMany(lote, { ordered: false });
        docs.forEach(d => obraIds.push({ _id: d._id, nombre: d.nombre, precio: d.precio_venta }));
      } catch (e) {
        // insertMany con ordered:false continua aunque haya duplicados
        if (e.insertedDocs) e.insertedDocs.forEach(d => obraIds.push({ _id: d._id, nombre: d.nombre, precio: d.precio_venta }));
      }
      insertados += tamLote;
    }
    console.log(`  ${genero}: ${n} obras`);
  }
  stop();

  const total = await Obra.countDocuments();
  console.log(`  Total en BD: ${total} obras`);
  return obraIds;
}

// ---------------------------------------------
// MySQL - 3000 usuarios + 15000 ventas en batch
// ---------------------------------------------
async function seedMySQL(obraIds) {
  console.log('\n[MySQL] Insertando 3000 usuarios + 15000 ventas...');
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'Museo',
  });

  const bcrypt  = require('bcrypt');
  const HASH    = await bcrypt.hash('HeavyUser2026!', 4); // cost 4 para velocidad maxima

  const nombres   = ['Maria','Carlos','Ana','Jorge','Laura','Pedro','Sofia','Luis','Elena','Pablo','Diego','Camila','Rodrigo','Fernanda','Sebastian','Valentina','Ricardo','Natalia','Felipe','Claudia','Alejandro','Gabriela','Hernan','Lucia','Mateo','Isabela','Andres','Monica','Rafael','Daniela','Miguel','Patricia','Eduardo','Silvia','Roberto','Adriana','Fernando','Lorena','Javier','Catalina'];
  const apellidos = ['Garcia','Martinez','Lopez','Gonzalez','Perez','Rodriguez','Sanchez','Jimenez','Torres','Flores','Morales','Reyes','Vargas','Cruz','Mendoza','Romero','Herrera','Castillo','Ortega','Ramos','Vega','Molina','Silva','Guerrero','Delgado','Gomez','Aguilar','Munoz','Rojas','Pena','Soto','Rios','Nunez','Alvarado','Fuentes','Medina','Espinoza','Ruiz','Chavez','Diaz'];
  const dominios  = ['gmail.com','hotmail.com','yahoo.com','outlook.com','icloud.com','live.com'];
  const tarjetaVisa = () => '4' + Array.from({length:15}, () => randInt(0,9)).join('');
  const tarjetaMC   = () => `5${randInt(1,5)}` + Array.from({length:14}, () => randInt(0,9)).join('');
  const expiracion  = () => `${randInt(2026,2031)}-${String(randInt(1,12)).padStart(2,'0')}-01`;

  // Insertar usuarios en lotes de 200
  const stopUs = timer('Insertar 3000 usuarios');
  const userIds = [];
  const LOTE_US = 200;

  for (let offset = 0; offset < 3000; offset += LOTE_US) {
    const lote = [];
    for (let i = offset; i < Math.min(offset + LOTE_US, 3000); i++) {
      const nombre   = pick(nombres);
      const apellido = pick(apellidos);
      const email    = `${norm(nombre)}.${norm(apellido)}.${String(i).padStart(5,'0')}@${pick(dominios)}`;
      lote.push([email, HASH, nombre, apellido, 'miembro']);
    }
    const [res] = await conn.query(
      'INSERT IGNORE INTO Usuario (email, password, nombre, apellido, tipo) VALUES ?',
      [lote]
    );
    // Recuperar los IDs insertados
    if (res.affectedRows > 0) {
      const firstId = res.insertId;
      for (let j = 0; j < res.affectedRows; j++) userIds.push(firstId + j);
    }
  }
  stopUs();
  console.log(`  ${userIds.length} usuarios nuevos insertados`);

  // Si no hay suficientes userIds, cargar de la BD
  if (userIds.length < 100) {
    const [rows] = await conn.execute('SELECT usuario_id FROM Usuario LIMIT 3000');
    rows.forEach(r => userIds.push(r.usuario_id));
  }

  // Insertar miembros para los nuevos usuarios
  const stopMb = timer('Insertar registros Miembro');
  if (userIds.length > 0) {
    const LOTE_MB = 500;
    for (let i = 0; i < userIds.length; i += LOTE_MB) {
      const lote = userIds.slice(i, i + LOTE_MB).map(uid => {
        const esVisa = Math.random() < 0.6;
        return [uid, esVisa ? tarjetaVisa() : tarjetaMC(), `Usuario ${uid}`, expiracion(), String(randInt(100,999))];
      });
      await conn.query(
        'INSERT IGNORE INTO Miembro (usuario_id, tarjeta_numero, tarjeta_nombre, tarjeta_expiracion, codigo_seguridad) VALUES ?',
        [lote]
      ).catch(() => {}); // ignorar duplicados
    }
  }
  stopMb();

  // Recuperar TODOS los userIds de la BD para las ventas
  const [todosUsers] = await conn.execute('SELECT usuario_id FROM Usuario');
  const allUserIds = todosUsers.map(r => r.usuario_id);

  // Insertar 15000 ventas en lotes de 500
  const stopVen = timer('Insertar 15000 ventas');
  const LOTE_VEN = 500;
  let ventasTotal = 0;
  const todasObras = obraIds.length > 0 ? obraIds : [{ _id: { toString: () => 'placeholder' }, nombre: 'Obra', precio: 5000 }];

  for (let offset = 0; offset < 15000; offset += LOTE_VEN) {
    const lote = [];
    for (let i = 0; i < LOTE_VEN; i++) {
      const o      = pick(todasObras);
      const uid    = pick(allUserIds);
      const precio = randFloat(500, 2500000);
      const mesesAtras = randInt(0, 36);
      const fecha  = new Date(Date.now() - mesesAtras * 30 * 86400000);
      lote.push([
        o._id.toString(), uid,
        String(o.nombre).substring(0, 250),
        'Artista Heavy',
        precio, randInt(5,20),
        fecha, fecha,
        pick(['vendida','vendida','vendida','reservada','cancelada'])
      ]);
    }
    const [res] = await conn.query(
      'INSERT INTO Venta (obra_id, comprador_id, obra_nombre, artista_nombre, precio_venta, porcentaje_ganancia, fecha_reserva, fecha_venta, estado) VALUES ?',
      [lote]
    ).catch(e => [{ affectedRows: 0 }]);
    ventasTotal += res.affectedRows || 0;
  }
  stopVen();

  const [[uTotal]] = await conn.execute('SELECT COUNT(*) as n FROM Usuario');
  const [[vTotal]] = await conn.execute('SELECT COUNT(*) as n FROM Venta');
  console.log(`  Total usuarios: ${uTotal.n} | Total ventas: ${vTotal.n}`);
  await conn.end();
}

// ---------------------------------------------
// Cassandra - 100000 eventos + 30000 visitas
// ---------------------------------------------
async function seedCassandra(obraIds) {
  console.log('\n[Cassandra] Insertando 100000 eventos + 30000 visitas...');
  const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1'],
    localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
    keyspace: 'museo_auditoria',
  });
  try {
    await client.connect();
  } catch {
    console.log('  SKIP: Cassandra no disponible. Inicia Cassandra primero.');
    return;
  }

  const nombres_ev  = ['maria','carlos','ana','jorge','laura','pedro','sofia','luis','elena','pablo','diego','camila','rodrigo','fernanda','sebastian','valentina','ricardo','natalia'];
  const apellidos_ev = ['garcia','martinez','lopez','gonzalez','perez','rodriguez','sanchez','torres','reyes','morales','vega','silva','castillo','ramos','herrera'];
  const dominios_ev  = ['gmail.com','hotmail.com','yahoo.com','outlook.com'];
  const ips = ['192.168.1.10','192.168.1.15','192.168.1.23','10.0.0.5','10.0.0.12','172.16.0.1','192.168.0.100','10.10.0.50','192.168.2.7','10.0.1.33'];

  const usuarios = Array.from({length:200}, () =>
    `${pick(nombres_ev)}.${pick(apellidos_ev)}${randInt(10,99)}@${pick(dominios_ev)}`
  );

  const tablas = ['eventos_login','eventos_compra','eventos_admin','eventos_sistema'];
  const tiposPorTabla = {
    eventos_login:   ['login_exitoso','login_exitoso','login_exitoso','login_exitoso','login_fallido','login_fallido'],
    eventos_compra:  ['solicitud_compra','solicitud_compra','reserva_creada','reserva_creada','compra_aceptada','compra_rechazada','reserva_cancelada'],
    eventos_admin:   ['cambio_rol','modificar_obra','modificar_obra','crear_usuario','eliminar_obra'],
    eventos_sistema: ['error_sistema','error_sistema','error_conexion','timeout','mantenimiento'],
  };
  const severidades = { eventos_login:'INFO', eventos_compra:'INFO', eventos_admin:'WARN', eventos_sistema:'ERROR' };
  const dist = { eventos_login:50000, eventos_compra:30000, eventos_admin:10000, eventos_sistema:10000 };

  // Insertar en paralelo por lotes de 1000
  const stopEv = timer('Insertar 100000 eventos');
  for (const tabla of tablas) {
    const n = dist[tabla];
    const LOTE = 1000;
    let insertados = 0;
    while (insertados < n) {
      const promises = [];
      const tamLote  = Math.min(LOTE, n - insertados);
      for (let i = 0; i < tamLote; i++) {
        const tipo = pick(tiposPorTabla[tabla]);
        const usr  = pick(usuarios);
        const ts   = new Date(Date.now() - randInt(0,365)*86400000 - randInt(0,86400000));
        const mes  = `${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}`;
        promises.push(
          client.execute(
            `INSERT INTO ${tabla} (mes, timestamp, id, tipo_evento, usuario, severidad, metadata, ip) VALUES (?,?,?,?,?,?,?,?)`,
            [mes, ts, cassandra.types.TimeUuid.now(), tipo, usr, severidades[tabla], '{}', pick(ips)],
            { prepare: true }
          )
        );
      }
      await Promise.all(promises);
      insertados += tamLote;
    }
    console.log(`  ${tabla}: ${n} eventos`);
  }
  stopEv();

  // 30000 visitas sobre 300 obras distintas
  const stopVis = timer('Insertar 30000 visitas');
  const muestra = obraIds.length > 0
    ? shuffle(obraIds).slice(0, Math.min(300, obraIds.length))
    : [];

  if (muestra.length > 0) {
    const LOTE_VIS = 500;
    let vis = 0;
    while (vis < 30000) {
      const promises = [];
      const tamLote  = Math.min(LOTE_VIS, 30000 - vis);
      for (let i = 0; i < tamLote; i++) {
        const o   = pick(muestra);
        const d   = new Date(Date.now() - randInt(0,90)*86400000);
        const hoy = d.toISOString().slice(0,10);
        promises.push(
          client.execute('UPDATE visitas_obra SET total = total + 1 WHERE obra_id = ? AND fecha = ?',
            [o._id.toString(), hoy], { prepare: true }),
          client.execute('UPDATE visitas_totales SET total = total + 1 WHERE obra_id = ?',
            [o._id.toString()], { prepare: true })
        );
      }
      await Promise.all(promises);
      vis += tamLote;
    }
  }
  stopVis();
  console.log(`  30000 visitas en ${muestra.length} obras`);

  // Conteos finales
  console.log('\n  Verificando totales...');
  for (const tabla of tablas) {
    const r = await client.execute(`SELECT COUNT(*) FROM ${tabla}`);
    console.log(`  ${tabla}: ${r.rows[0].count}`);
  }
  const rv = await client.execute('SELECT COUNT(*) FROM visitas_totales');
  console.log(`  visitas_totales: ${rv.rows[0].count} obras`);

  await client.shutdown();
}

// ---------------------------------------------
// Main
// ---------------------------------------------
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  HEAVY SEED - Carga masiva para benchmark ║');
  console.log('║  MongoDB +5000  MySQL +15000  Cass +100k  ║');
  console.log('╚══════════════════════════════════════════╝');

  const total = timer('TOTAL');
  try {
    const obraIds = await seedMongoDB();
    await seedMySQL(obraIds);
    await seedCassandra(obraIds);
  } catch(e) {
    console.error('\nError:', e.stack || e.message);
  } finally {
    await mongoose.disconnect();
  }
  total();
  console.log('\nHeavy seed completado.');
}

main();
