const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'eventos.json');
const RESUMES_FILE = path.join(DATA_DIR, 'resumenes.json');

let eventos = [];
let resumenes = {};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDataDir();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      eventos = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    }
  } catch { eventos = []; }

  try {
    if (fs.existsSync(RESUMES_FILE)) {
      resumenes = JSON.parse(fs.readFileSync(RESUMES_FILE, 'utf-8'));
    }
  } catch { resumenes = {}; }
}

function save() {
  ensureDataDir();
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventos, null, 2));
    fs.writeFileSync(RESUMES_FILE, JSON.stringify(resumenes, null, 2));
  } catch { /* silencioso */ }
}

// Inicializar
load();

module.exports = {
  /** Registrar un evento */
  registrarEvento({ tipo_evento, usuario, severidad, metadata, ip }) {
    const ahora = new Date();
    const id = crypto.randomUUID();
    const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

    const evento = {
      id,
      timestamp: ahora.toISOString(),
      mes,
      tipo_evento,
      usuario,
      severidad,
      metadata: metadata || {},
      ip: ip || null,
    };

    eventos.unshift(evento);
    save();

    return { id, timestamp: ahora };
  },

  /** Consultar eventos con filtros */
  consultarEventos({ tipo_evento, desde, hasta, limite = 100 }) {
    const max = Math.min(limite, 1000);
    const inicio = desde ? new Date(desde).getTime() : 0;
    const fin = hasta ? new Date(hasta).getTime() : Date.now();

    let filtrados = eventos.filter(e => {
      const ts = new Date(e.timestamp).getTime();
      return ts >= inicio && ts <= fin;
    });

    if (tipo_evento) {
      filtrados = filtrados.filter(e => e.tipo_evento === tipo_evento);
    }

    return filtrados.slice(0, max).map(e => ({
      ...e,
      metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata,
    }));
  },

  /** Actualizar resumen diario */
  actualizarResumen(tipo_evento, fecha) {
    const key = `${tipo_evento}::${fecha}`;
    resumenes[key] = (resumenes[key] || 0) + 1;
    save();
  },

  /** Consultar resúmenes */
  consultarResumenes({ tipo_evento, fecha }) {
    const resultados = [];
    const tipos = tipo_evento ? [tipo_evento] : [
      'login_exitoso', 'login_fallido', 'solicitud_compra', 'compra_aceptada',
      'compra_rechazada', 'compra_cancelada', 'modificacion_obra',
      'modificacion_artista', 'cambio_rol', 'error_sistema',
    ];

    for (const tipo of tipos) {
      const key = `${tipo}::${fecha}`;
      resultados.push({
        tipo_evento: tipo,
        fecha,
        total: (resumenes[key] || 0).toString(),
      });
    }

    return resultados;
  },
};
