/**
 * Script CLI - Reto de Innovación (+5%): Lenguaje Natural a Cypher.
 *
 * Traduce una pregunta en español a una consulta Cypher de solo lectura, la
 * ejecuta en el grafo del museo y muestra el resultado.
 *
 * Uso:
 *   node scripts/nl2cypher.js "Muéstrame obras del mismo género que compré" --usuario 2
 *   node scripts/nl2cypher.js "¿Cuáles son las obras más compradas?"
 *   node scripts/nl2cypher.js "Pinturas disponibles de menos de 50000"
 *
 * Si existe ANTHROPIC_API_KEY usa el modelo Claude; si no, el motor de reglas.
 */
require('dotenv').config();
const { traducir } = require('../services/nlToCypher');
const { run, close } = require('../config/neo4j');

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Uso: node scripts/nl2cypher.js "<pregunta>" [--usuario <id>]');
        process.exit(1);
    }

    // Separa la pregunta de la bandera --usuario
    let usuario_id = null;
    const partes = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--usuario' || args[i] === '-u') { usuario_id = args[++i]; }
        else partes.push(args[i]);
    }
    const pregunta = partes.join(' ');

    console.log('\n  Pregunta : ' + pregunta);
    if (usuario_id != null) console.log('  Usuario  : ' + usuario_id);

    const t = await traducir(pregunta, { usuario_id });
    if (!t) {
        console.log('\n  No se entendió la pregunta. Prueba con frases como:');
        console.log('   - "Muéstrame obras del mismo género que compré"  (con --usuario <id>)');
        console.log('   - "¿Cuáles son las obras más compradas?"');
        console.log('   - "Esculturas disponibles de menos de 80000"');
        await close();
        return;
    }

    console.log('\n  Motor    : ' + t.fuente + '   (intent: ' + t.intent + ')');
    console.log('  Sentido  : ' + t.explicacion);
    console.log('\n  Cypher generado:\n');
    console.log(t.cypher.split('\n').map(l => '    ' + l).join('\n'));
    console.log('\n  Parámetros: ' + JSON.stringify(t.params));

    const filas = await run(t.cypher, t.params);
    console.log('\n  Resultados (' + filas.length + '):');
    if (filas.length === 0) {
        console.log('    (sin resultados)');
    } else {
        filas.slice(0, 20).forEach((f, i) => console.log('   ' + String(i + 1).padStart(2) + '. ' + JSON.stringify(f)));
    }
    console.log('');
    await close();
}

main().catch(async (e) => { console.error('Error:', e.message); await close().catch(() => {}); process.exit(1); });
