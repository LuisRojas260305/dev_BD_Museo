/**
 * Backfill de descripciones de obras con IA (Groq).
 *
 * Recorre el catálogo (vía la API del propio Backend) y dispara la generación de
 * descripción para las obras que tienen foto real y aún no tienen una descripción
 * "real" (los stubs cortos del seed masivo se tratan como ausentes). Cada llamada
 * al endpoint genera y guarda la descripción; se hace una pausa entre llamadas
 * para respetar el rate limit de la capa gratuita de Groq.
 *
 * Requisitos: el Backend (puerto 3000) y el mongodb-service (3001) deben estar
 * en ejecución, y GROQ_API_KEY debe estar en Backend/.env (si no, las
 * descripciones saldrían por plantilla).
 *
 * Uso (desde la carpeta Backend):
 *   node scripts/backfill-descripciones.js
 */
require('dotenv').config();
const axios = require('axios');

const API = process.env.API_BASE || 'http://localhost:3000/api';
const DESC_MIN = 60;      // mismo umbral que las rutas
const PAUSA_MS = 1500;    // respiro entre llamadas a Groq

const esDescripcionReal = (d) => !!d && d.trim().length >= DESC_MIN;
const tieneFotoReal = (f) => !!f && !/placehold\.co|via\.placeholder|placeholder\.com/i.test(f);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function traerCatalogo() {
    let page = 1, obras = [];
    while (true) {
        const { data } = await axios.get(`${API}/catalogo`, { params: { limit: 100, page }, timeout: 30000 });
        obras = obras.concat(data.data || []);
        if (page >= (data.totalPages || 1)) break;
        page++;
    }
    return obras;
}

(async () => {
    const obras = await traerCatalogo();
    console.log(`Catálogo: ${obras.length} obras.`);
    let generadas = 0, saltadas = 0;

    for (const obra of obras) {
        const foto = Array.isArray(obra.fotos) && obra.fotos.length ? obra.fotos[0] : '';
        if (!tieneFotoReal(foto) || esDescripcionReal(obra.descripcion)) {
            saltadas++;
            continue;
        }
        try {
            const { data } = await axios.post(`${API}/catalogo/obras/${obra._id}/descripcion`, {}, { timeout: 20000 });
            if (data.generada) {
                generadas++;
                console.log(`[${generadas}] ${obra.nombre}\n     ${(data.descripcion || '').slice(0, 80)}...`);
            } else {
                saltadas++;
            }
            await dormir(PAUSA_MS);
        } catch (e) {
            console.error(`Error en ${obra.nombre}:`, e.message);
        }
    }

    console.log(`\nListo. Total: ${obras.length} | generadas: ${generadas} | saltadas: ${saltadas}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
