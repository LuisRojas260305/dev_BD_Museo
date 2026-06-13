/**
 * Panel de administración del grafo (Neo4j) - Museo de Arte.
 * Sirve un dashboard HTML autónomo (sin CDN) con: estadísticas del grafo,
 * visualización force-directed del subgrafo, distribución por género,
 * probador de recomendaciones, lenguaje natural y consola Cypher.
 */
const express = require('express');
const router = express.Router();
const grafo = require('../models/grafo');
const nlToCypher = require('../services/nlToCypher');

// -----------------------------------------------------------------
// HTML del panel
// -----------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Neo4j Admin - Museo</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;
      --cyan:#18bfff;--blue:#58a6ff;--green:#3fb950;--yellow:#d29922;--purple:#bc8cff;--red:#e94560;
      --text:#e6edf3;--muted:#8b949e;
    }
    body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    header{background:var(--surface);padding:1rem 2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
    header h1{color:var(--cyan);font-size:1.3rem;font-weight:700}
    header .meta{color:var(--muted);font-size:.8rem}
    .refresh-btn{background:var(--surface2);border:1px solid var(--border);color:var(--blue);padding:.3rem .9rem;border-radius:6px;cursor:pointer;font-size:.8rem}
    .refresh-btn:hover{background:var(--blue);color:#000}
    .container{max-width:1300px;margin:0 auto;padding:1.5rem;display:flex;flex-direction:column;gap:1.2rem}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:1.3rem}
    .card-title{color:var(--muted);font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem}
    .card-title::after{content:'';flex:1;height:1px;background:var(--border)}
    .grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:.8rem}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem}
    .stat-box{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center;transition:.2s}
    .stat-box:hover{border-color:var(--cyan);transform:translateY(-2px)}
    .stat-box .num{font-size:2.1rem;font-weight:700;line-height:1;margin-bottom:.3rem}
    .stat-box .lbl{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
    .bar-row{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}
    .bar-row .bar-label{width:110px;font-size:.8rem;text-align:right;color:var(--muted);flex-shrink:0}
    .bar-row .bar-track{flex:1;background:var(--surface2);border-radius:4px;height:18px;overflow:hidden}
    .bar-row .bar-fill{height:100%;border-radius:4px;transition:width .6s ease;display:flex;align-items:center;padding-left:6px;font-size:.7rem;color:#fff;font-weight:600}
    .bar-row .bar-val{width:50px;font-size:.8rem;text-align:right;color:var(--text);flex-shrink:0}
    table{width:100%;border-collapse:collapse;font-size:.82rem}
    th{background:var(--surface2);color:var(--muted);padding:.55rem .75rem;text-align:left;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)}
    td{padding:.48rem .75rem;border-bottom:1px solid var(--border);vertical-align:middle}
    tr:hover td{background:rgba(255,255,255,.02)}
    .btn{background:var(--cyan);color:#04222e;border:none;border-radius:6px;padding:.45rem 1.1rem;cursor:pointer;font-size:.82rem;font-weight:600;transition:.15s}
    .btn:hover{opacity:.85}
    .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);font-weight:400}
    .btn-ghost:hover{border-color:var(--cyan);color:var(--cyan)}
    .btn-danger{background:#6e1c28;color:#fff}
    .btn-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem}
    input,select,textarea{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.45rem .6rem;font-size:.82rem;font-family:inherit}
    textarea{width:100%;font-family:monospace;resize:vertical;min-height:64px}
    #cy-result,#rec-result{margin-top:.8rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.8rem;font-size:.78rem;overflow:auto;white-space:pre-wrap;max-height:320px;display:none}
    .empty{color:var(--muted);padding:.8rem;font-size:.85rem}
    .legend{display:flex;gap:.55rem 1rem;flex-wrap:wrap;margin-bottom:.7rem;font-size:.76rem;color:var(--muted);align-items:center}
    .legend span{display:inline-flex;align-items:center}
    .legend .dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:.35rem;vertical-align:middle;box-shadow:0 0 6px rgba(0,0,0,.4)}
    .legend .line{display:inline-block;width:16px;height:3px;border-radius:2px;margin-right:.35rem;vertical-align:middle}
    .legend .legend-sep{width:1px;height:14px;background:var(--border);margin:0 .2rem}
    #graph-canvas{width:100%;height:480px;background:radial-gradient(circle at 50% 35%,#13212c,#0c1016 70%);border:1px solid var(--border);border-radius:8px;cursor:grab;display:block}
    .zoom-controls{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;align-items:center;gap:.35rem;background:rgba(13,17,23,.7);border:1px solid var(--border);border-radius:8px;padding:.4rem .3rem}
    .zoom-btn{width:30px;height:30px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--cyan);font-size:1rem;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;transition:.15s}
    .zoom-btn:hover{background:var(--cyan);color:#04222e}
    .zoom-label{font-size:.68rem;color:var(--muted);font-variant-numeric:tabular-nums}
    .pill{display:inline-block;border-radius:10px;padding:1px 8px;font-size:.7rem;font-weight:600}
    @media(max-width:800px){.grid5,.grid2{grid-template-columns:1fr}}
  </style>
</head>
<body>

<header>
  <div>
    <h1>Neo4j Admin - Redes y Recomendaciones</h1>
    <div class="meta">grafo: Comprador-[COMPRÓ]-&gt;Obra&lt;-[CREÓ]-Artista-[TRABAJA_EN]-&gt;Genero &nbsp;|&nbsp; <span id="last-update">cargando...</span></div>
  </div>
  <button class="refresh-btn" onclick="recargarTodo()">Actualizar</button>
</header>

<div class="container">

  <!-- Stat cards -->
  <div class="card">
    <div class="card-title">Resumen del grafo</div>
    <div class="grid5">
      <div class="stat-box"><div class="num" id="cnt-compradores" style="color:var(--blue)">-</div><div class="lbl">Compradores</div></div>
      <div class="stat-box"><div class="num" id="cnt-obras"   style="color:var(--cyan)">-</div><div class="lbl">Obras</div></div>
      <div class="stat-box"><div class="num" id="cnt-artistas" style="color:var(--purple)">-</div><div class="lbl">Artistas</div></div>
      <div class="stat-box"><div class="num" id="cnt-generos" style="color:var(--yellow)">-</div><div class="lbl">Géneros</div></div>
      <div class="stat-box"><div class="num" id="cnt-compras" style="color:var(--green)">-</div><div class="lbl">Compras</div></div>
    </div>
  </div>

  <!-- Visualizacion del grafo -->
  <div class="card">
    <div class="card-title">Visualización del grafo (subconjunto)</div>
    <div class="legend">
      <span><span class="dot" style="background:#58a6ff"></span>Comprador</span>
      <span><span class="dot" style="background:#18bfff"></span>Obra</span>
      <span><span class="dot" style="background:#bc8cff"></span>Artista</span>
      <span><span class="dot" style="background:#d29922"></span>Género</span>
      <span class="legend-sep"></span>
      <span><span class="line" style="background:#3fb950"></span>COMPRÓ</span>
      <span><span class="line" style="background:#bc8cff"></span>CREÓ</span>
      <span><span class="line" style="background:#18bfff"></span>PERTENECE_A</span>
      <span><span class="line" style="background:#d29922"></span>TRABAJA_EN</span>
    </div>
    <div style="position:relative">
      <canvas id="graph-canvas"></canvas>
      <div class="zoom-controls">
        <button class="zoom-btn" onclick="zoomBoton(1.2)" title="Acercar">+</button>
        <span class="zoom-label" id="zoom-label">100%</span>
        <button class="zoom-btn" onclick="zoomBoton(1/1.2)" title="Alejar">&minus;</button>
        <button class="zoom-btn" onclick="resetVista()" title="Restablecer vista">&#8634;</button>
      </div>
    </div>
    <div style="font-size:.72rem;color:var(--muted);margin-top:.4rem">Rueda del ratón para hacer zoom &middot; arrastra el fondo para mover &middot; arrastra un nodo para reorganizar. Muestra hasta 75 relaciones.</div>
  </div>

  <div class="grid2">
    <!-- Probador de recomendaciones -->
    <div class="card">
      <div class="card-title">Probar recomendación</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <input id="rec-usuario" type="number" placeholder="usuario_id" style="width:120px">
        <select id="rec-estrategia">
          <option value="genero">Por género</option>
          <option value="artista">Por artista</option>
          <option value="colaborativo">Colaborativo</option>
        </select>
        <input id="rec-limite" type="number" value="10" style="width:70px" title="límite">
        <button class="btn" onclick="probarRec()">Recomendar</button>
      </div>
      <div id="rec-result"></div>
    </div>

    <!-- Distribucion por genero -->
    <div class="card">
      <div class="card-title">Obras por género</div>
      <div id="dist-genero"><div class="empty">Cargando...</div></div>
    </div>
  </div>


  <!-- Lenguaje natural a Cypher (Reto +5%) -->
  <div class="card">
    <div class="card-title">Pregunta en lenguaje natural</div>
    <div style="font-size:.78rem;color:var(--muted);margin-bottom:.7rem">Escribe una pregunta en español y el sistema la traduce a Cypher y la ejecuta. Si hay un usuario_id, se usan tus compras.</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="setNL('Muéstrame obras del mismo género que compré')">Mismo género</button>
      <button class="btn btn-ghost" onclick="setNL('Recomiéndame del mismo artista que compré')">Mismo artista</button>
      <button class="btn btn-ghost" onclick="setNL('¿Qué compraron coleccionistas como yo?')">Colaborativo</button>
      <button class="btn btn-ghost" onclick="setNL('¿Cuáles son las obras más compradas?')">Más compradas</button>
      <button class="btn btn-ghost" onclick="setNL('Esculturas disponibles de menos de 80000')">Esculturas baratas</button>
      <button class="btn btn-ghost" onclick="setNL('Pinturas disponibles')">Pinturas</button>
      <button class="btn btn-ghost" onclick="setNL('Fotografías de más de 100000')">Fotos caras</button>
      <button class="btn btn-ghost" onclick="setNL('Obras de Leonardo da Vinci')">Por artista</button>
      <button class="btn btn-ghost" onclick="setNL('¿Cuántas obras hay?')">Conteo obras</button>
      <button class="btn btn-ghost" onclick="setNL('¿Cuántos artistas hay?')">Conteo artistas</button>
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
      <input id="nl-q" type="text" placeholder="Ej: Pinturas disponibles de menos de 50000" style="flex:1;min-width:240px">
      <input id="nl-uid" type="number" placeholder="usuario_id" style="width:120px" title="opcional, para 'compré'">
      <button class="btn" onclick="runNL()">Traducir y ejecutar</button>
    </div>
    <div id="nl-result" style="margin-top:.8rem;display:none"></div>
  </div>

  <!-- Consola Cypher -->
  <div class="card">
    <div class="card-title">Consola Cypher</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="setQ('MATCH (c:Comprador)-[:COMPRÓ]->(o:Obra) RETURN c.nombre, o.nombre LIMIT 25')">Compras</button>
      <button class="btn btn-ghost" onclick="setQ('MATCH (a:Artista)-[:CREÓ]->(o:Obra) RETURN a.nombre, o.nombre LIMIT 25')">Autorías</button>
      <button class="btn btn-ghost" onclick="setQ('MATCH (a:Artista)-[:TRABAJA_EN]->(g:Genero) RETURN a.nombre, g.nombre LIMIT 25')">Artista-Género</button>
      <button class="btn btn-ghost" onclick="setQ('MATCH (o:Obra) WHERE o.estado = \\'Disponible\\' RETURN o.nombre, o.genero, o.precio LIMIT 25')">Disponibles</button>
      <button class="btn btn-danger" style="margin-left:auto" onclick="borrarGrafo()">Borrar grafo</button>
    </div>
    <textarea id="cypher" rows="3" placeholder="MATCH (n) RETURN n LIMIT 10"></textarea>
    <div style="margin-top:.6rem;display:flex;gap:.5rem">
      <button class="btn" onclick="runCypher()">Ejecutar</button>
      <button class="btn btn-ghost" onclick="document.getElementById('cy-result').style.display='none'">Limpiar resultado</button>
    </div>
    <div id="cy-result"></div>
  </div>

</div>

<script>
  const COLOR = { Comprador:'#58a6ff', Obra:'#18bfff', Artista:'#bc8cff', Genero:'#d29922' };

  async function loadStats() {
    var d = await (await fetch('/admin/api/stats')).json();
    ['compradores','obras','artistas','generos','compras'].forEach(function(k){
      document.getElementById('cnt-'+k).textContent = (d[k] != null ? d[k] : 0).toLocaleString();
    });
  }

  async function loadGenero() {
    var d = await (await fetch('/admin/api/generos')).json();
    var el = document.getElementById('dist-genero');
    if (!d.generos || !d.generos.length) { el.innerHTML = '<div class="empty">Sin datos.</div>'; return; }
    var max = Math.max.apply(null, d.generos.map(function(g){return g.total;})) || 1;
    var colores = ['#18bfff','#bc8cff','#d29922','#3fb950','#58a6ff','#e94560'];
    el.innerHTML = d.generos.map(function(g,i){
      var pct = Math.max(4, Math.round(g.total/max*100));
      return '<div class="bar-row"><span class="bar-label">'+g.genero+'</span>'+
        '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+colores[i%colores.length]+'">'+g.total+'</div></div>'+
        '<span class="bar-val">'+g.total+'</span></div>';
    }).join('');
  }

  async function probarRec() {
    var u = document.getElementById('rec-usuario').value;
    var est = document.getElementById('rec-estrategia').value;
    var lim = document.getElementById('rec-limite').value || 10;
    var res = document.getElementById('rec-result');
    res.style.display = 'block';
    if (!u) { res.textContent = 'Indica un usuario_id.'; return; }
    res.textContent = 'Consultando grafo...';
    var d = await (await fetch('/admin/api/recomendaciones?usuario='+u+'&estrategia='+est+'&limite='+lim)).json();
    if (d.error) { res.textContent = 'Error: '+d.error; return; }
    if (!d.recomendaciones || !d.recomendaciones.length) { res.textContent = 'Sin recomendaciones (¿el usuario tiene compras?).'; return; }
    var html = '<table><thead><tr><th>Obra</th><th>Género</th><th>Artista</th><th>Precio</th></tr></thead><tbody>';
    d.recomendaciones.forEach(function(r){
      html += '<tr><td>'+(r.nombre||'-')+'</td><td>'+(r.genero||'-')+'</td><td>'+(r.artista||'-')+'</td><td>'+(r.precio!=null?('$'+r.precio):'-')+'</td></tr>';
    });
    res.innerHTML = html + '</tbody></table>';
  }

  function setQ(q){ document.getElementById('cypher').value = q; runCypher(); }
  async function runCypher() {
    var res = document.getElementById('cy-result');
    res.style.display = 'block'; res.textContent = 'Ejecutando...';
    var cy = document.getElementById('cypher').value.trim();
    var d = await (await fetch('/admin/api/query', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ cypher: cy }) })).json();
    res.textContent = d.error ? 'Error: '+d.error : JSON.stringify(d.rows, null, 2);
  }
  async function borrarGrafo() {
    if (!confirm('¿Borrar TODO el grafo? Esta acción no se puede deshacer.')) return;
    var d = await (await fetch('/admin/api/clear', { method:'POST' })).json();
    alert(d.error ? 'Error: '+d.error : 'Grafo borrado.');
    recargarTodo();
  }

  // -------- Visualizacion force-directed (canvas vanilla) --------
  var canvas, ctx, nodos = [], aristas = [], drag = null, raf = null;
  // Vista: escala (zoom) y desplazamiento (paneo). El grafo vive en coordenadas
  // "mundo"; la vista las transforma a pantalla.
  var view = { scale: 1, tx: 0, ty: 0 };
  var pan = null;       // estado del paneo con arrastre del fondo
  var dpr = 1;          // densidad de pixeles (nitidez en pantallas HiDPI)
  var Wcss = 0, Hcss = 0; // dimensiones del canvas en pixeles CSS
  var hover = null;     // nodo bajo el cursor
  var vecinos = null;   // ids de nodos conectados al nodo en hover

  // Color de cada tipo de relacion (aristas)
  var COLOR_REL = {
    'COMPRÓ':      '#3fb950',
    'CREÓ':        '#bc8cff',
    'PERTENECE_A': '#18bfff',
    'TRABAJA_EN':  '#d29922',
  };

  // Radio del nodo segun su numero de conexiones (grado)
  function radio(n){ return 7 + Math.min(9, (n.grado||0) * 0.8); }

  function ajustarTamano() {
    dpr = window.devicePixelRatio || 1;
    Wcss = canvas.clientWidth; Hcss = canvas.clientHeight;
    canvas.width = Math.round(Wcss * dpr);
    canvas.height = Math.round(Hcss * dpr);
  }

  function initCanvas() {
    canvas = document.getElementById('graph-canvas');
    ctx = canvas.getContext('2d');
    ajustarTamano();

    canvas.addEventListener('mousedown', function(e){
      var w = mundo(e);
      drag = nodos.find(function(n){ return Math.hypot(n.x-w.x,n.y-w.y) < (radio(n)+6)/view.scale; }) || null;
      if (drag) { canvas.style.cursor='grabbing'; }
      else { pan = { sx:e.clientX, sy:e.clientY, tx:view.tx, ty:view.ty }; canvas.style.cursor='grabbing'; }
    });
    window.addEventListener('mousemove', function(e){
      if (drag) { var w = mundo(e); drag.x = w.x; drag.y = w.y; drag.fx = true; }
      else if (pan) { view.tx = pan.tx + (e.clientX - pan.sx); view.ty = pan.ty + (e.clientY - pan.sy); }
      else { detectarHover(e); }
    });
    window.addEventListener('mouseup', function(){
      if (drag) { drag.fx=false; drag=null; }
      pan = null; canvas.style.cursor='grab';
    });
    canvas.addEventListener('mouseleave', function(){ hover = null; vecinos = null; });

    // Reajuste al cambiar el tamano de la ventana
    window.addEventListener('resize', ajustarTamano);

    // Zoom con la rueda, centrado en el cursor.
    canvas.addEventListener('wheel', function(e){
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var sx = e.clientX - r.left, sy = e.clientY - r.top;
      var factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      var nuevo = Math.max(0.25, Math.min(4, view.scale * factor));
      factor = nuevo / view.scale;
      // mantener fijo el punto bajo el cursor
      view.tx = sx - (sx - view.tx) * factor;
      view.ty = sy - (sy - view.ty) * factor;
      view.scale = nuevo;
      actualizarZoomLabel();
    }, { passive: false });
  }
  // Posicion del raton en coordenadas de pantalla.
  function pantalla(e){ var r = canvas.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
  // Posicion del raton convertida a coordenadas del mundo (deshace la vista).
  function mundo(e){ var s = pantalla(e); return { x:(s.x-view.tx)/view.scale, y:(s.y-view.ty)/view.scale }; }

  // Detecta el nodo bajo el cursor y precalcula sus vecinos para el resaltado.
  function detectarHover(e){
    var w = mundo(e);
    var nuevo = nodos.find(function(n){ return Math.hypot(n.x-w.x,n.y-w.y) < (radio(n)+5)/view.scale; }) || null;
    if (nuevo === hover) return;
    hover = nuevo;
    canvas.style.cursor = hover ? 'pointer' : 'grab';
    if (!hover) { vecinos = null; return; }
    vecinos = {};
    vecinos[hover.id] = true;
    aristas.forEach(function(ar){
      if (!ar.a || !ar.b) return;
      if (ar.a === hover) vecinos[ar.b.id] = true;
      if (ar.b === hover) vecinos[ar.a.id] = true;
    });
  }

  function actualizarZoomLabel(){
    var el = document.getElementById('zoom-label');
    if (el) el.textContent = Math.round(view.scale*100) + '%';
  }
  function resetVista(){ view.scale = 1; view.tx = 0; view.ty = 0; actualizarZoomLabel(); }
  function zoomBoton(factor){
    var nuevo = Math.max(0.25, Math.min(4, view.scale * factor));
    var cx = canvas.width/2, cy = canvas.height/2, f = nuevo/view.scale;
    view.tx = cx - (cx - view.tx) * f;
    view.ty = cy - (cy - view.ty) * f;
    view.scale = nuevo; actualizarZoomLabel();
  }

  async function loadGrafo() {
    var d = await (await fetch('/admin/api/grafo')).json();
    var mapa = {};
    nodos = []; aristas = [];
    (d.edges||[]).forEach(function(ed){
      [['origen_id','origen_tipo','origen_label'],['destino_id','destino_tipo','destino_label']].forEach(function(k){
        var id = ed[k[0]];
        if (!mapa[id]) {
          mapa[id] = { id:id, tipo:ed[k[1]], label:ed[k[2]]||'', grado:0,
            x:Wcss/2+(Math.random()-.5)*Math.min(Wcss,520), y:Hcss/2+(Math.random()-.5)*Math.min(Hcss,360), vx:0, vy:0 };
          nodos.push(mapa[id]);
        }
      });
      var a = mapa[ed.origen_id], b = mapa[ed.destino_id];
      if (a) a.grado++; if (b) b.grado++;
      aristas.push({ a:a, b:b, rel:ed.relacion });
    });
    hover = null; vecinos = null;
    if (!raf) tick();
  }
  function tick() {
    // fuerzas: repulsion entre nodos + resortes en aristas + centrado
    for (var i=0;i<nodos.length;i++){
      var n = nodos[i]; if (n.fx) continue;
      for (var j=0;j<nodos.length;j++){
        if (i===j) continue; var o = nodos[j];
        var dx=n.x-o.x, dy=n.y-o.y, dist=Math.hypot(dx,dy)||1;
        var f = 1700/(dist*dist);
        n.vx += dx/dist*f; n.vy += dy/dist*f;
      }
      n.vx += (Wcss/2 - n.x)*0.0012;
      n.vy += (Hcss/2 - n.y)*0.0012;
    }
    aristas.forEach(function(e){
      if(!e.a||!e.b) return;
      var dx=e.b.x-e.a.x, dy=e.b.y-e.a.y, dist=Math.hypot(dx,dy)||1, f=(dist-95)*0.02;
      var fx=dx/dist*f, fy=dy/dist*f;
      if(!e.a.fx){e.a.vx+=fx;e.a.vy+=fy;} if(!e.b.fx){e.b.vx-=fx;e.b.vy-=fy;}
    });
    nodos.forEach(function(n){ if(n.fx)return; n.vx*=0.86; n.vy*=0.86; n.x+=n.vx; n.y+=n.vy;
      var rr=radio(n);
      n.x=Math.max(rr,Math.min(Wcss-rr,n.x)); n.y=Math.max(rr,Math.min(Hcss-rr,n.y)); });
    render();
    raf = requestAnimationFrame(tick);
  }
  // Aclara/oscurece un color hex en una fraccion (-1..1) para el gradiente.
  function tinte(hex, f){
    var n = parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    var d = f<0 ? 0 : 255, p = Math.abs(f);
    r=Math.round(r+(d-r)*p); g=Math.round(g+(d-g)*p); b=Math.round(b+(d-b)*p);
    return 'rgb('+r+','+g+','+b+')';
  }

  function render() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // Vista (zoom + paneo) multiplicada por la densidad de pixeles (nitidez).
    ctx.setTransform(view.scale*dpr,0,0,view.scale*dpr, view.tx*dpr, view.ty*dpr);

    var resaltando = !!hover;

    // -------- Aristas: curvas suaves con color por relacion y flecha --------
    aristas.forEach(function(e){
      if(!e.a||!e.b) return;
      var activo = !resaltando || (e.a===hover || e.b===hover);
      var col = COLOR_REL[e.rel] || '#8b949e';
      var dx=e.b.x-e.a.x, dy=e.b.y-e.a.y, dist=Math.hypot(dx,dy)||1;
      // punto de control desplazado perpendicularmente => arco suave
      var mx=(e.a.x+e.b.x)/2, my=(e.a.y+e.b.y)/2;
      var nx=-dy/dist, ny=dx/dist, curva=Math.min(28, dist*0.12);
      var cx=mx+nx*curva, cy=my+ny*curva;
      ctx.beginPath();
      ctx.moveTo(e.a.x,e.a.y); ctx.quadraticCurveTo(cx,cy,e.b.x,e.b.y);
      ctx.strokeStyle = activo ? col : 'rgba(139,148,158,.10)';
      ctx.globalAlpha = activo ? (resaltando?0.85:0.45) : 1;
      ctx.lineWidth = (activo && resaltando ? 2 : 1.1)/view.scale;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // flecha de direccion cerca del destino
      if (activo) {
        var rb = radio(e.b);
        var ang = Math.atan2(e.b.y-cy, e.b.x-cx);
        var ax = e.b.x - Math.cos(ang)*(rb+1), ay = e.b.y - Math.sin(ang)*(rb+1);
        var s = 5/view.scale;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang-0.4)*s*1.8, ay - Math.sin(ang-0.4)*s*1.8);
        ctx.lineTo(ax - Math.cos(ang+0.4)*s*1.8, ay - Math.sin(ang+0.4)*s*1.8);
        ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      }
      // etiqueta de la relacion (solo si resaltando esta arista, o pocas aristas)
      if (activo && (resaltando || aristas.length <= 40)) {
        ctx.font = (9/view.scale)+'px monospace';
        ctx.fillStyle = activo && resaltando ? col : 'rgba(139,148,158,.6)';
        ctx.textAlign = 'center';
        ctx.fillText(e.rel, cx, cy - 2/view.scale);
        ctx.textAlign = 'start';
      }
    });

    // -------- Nodos: gradiente radial + halo + borde --------
    nodos.forEach(function(n){
      var c = COLOR[n.tipo] || '#888';
      var r = radio(n);
      var activo = !resaltando || (vecinos && vecinos[n.id]);
      ctx.globalAlpha = activo ? 1 : 0.25;
      // halo de los nodos en hover
      if (resaltando && n===hover) {
        ctx.beginPath(); ctx.arc(n.x,n.y,r+6/view.scale,0,Math.PI*2);
        ctx.fillStyle = c; ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1;
      }
      var grad = ctx.createRadialGradient(n.x-r*0.35, n.y-r*0.35, r*0.2, n.x, n.y, r);
      grad.addColorStop(0, tinte(c, 0.45));
      grad.addColorStop(1, c);
      ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.lineWidth = 1.4/view.scale; ctx.strokeStyle = tinte(c, -0.35);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // -------- Etiquetas de nodo con fondo (legibilidad) --------
    ctx.font = (10/view.scale)+'px Segoe UI';
    ctx.textBaseline = 'middle';
    nodos.forEach(function(n){
      var activo = !resaltando || (vecinos && vecinos[n.id]);
      if (resaltando && !activo) return;            // oculta etiquetas atenuadas
      if (!resaltando && nodos.length > 45 && n.grado < 2) return; // evita saturar
      var r = radio(n);
      var txt = String(n.label).substring(0,18);
      var w = ctx.measureText(txt).width;
      var lx = n.x + r + 5/view.scale, ly = n.y;
      ctx.fillStyle = 'rgba(13,17,23,.72)';
      var pad = 3/view.scale, h = 13/view.scale;
      ctx.fillRect(lx-pad, ly-h/2, w+pad*2, h);
      ctx.fillStyle = (resaltando && n===hover) ? '#fff' : '#cbd5e1';
      ctx.fillText(txt, lx, ly+0.5/view.scale);
    });
    ctx.textBaseline = 'alphabetic';

    ctx.setTransform(1,0,0,1,0,0);
  }

  async function recargarTodo() {
    document.getElementById('last-update').textContent = 'actualizando...';
    await Promise.all([loadStats(), loadGenero(), loadGrafo()]);
    document.getElementById('last-update').textContent = 'actualizado: ' + new Date().toLocaleTimeString('es');
  }

  // -------- Lenguaje natural a Cypher (Reto +5%) --------
  function setNL(q){ document.getElementById('nl-q').value = q; runNL(); }
  async function runNL() {
    var box = document.getElementById('nl-result');
    box.style.display = 'block';
    box.innerHTML = '<div class="empty">Traduciendo...</div>';
    var pregunta = document.getElementById('nl-q').value.trim();
    var uid = document.getElementById('nl-uid').value;
    if (!pregunta) { box.innerHTML = '<div class="empty">Escribe una pregunta.</div>'; return; }
    var r = await fetch('/admin/api/nl2cypher', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ pregunta: pregunta, usuario_id: uid || undefined })
    });
    var d = await r.json();
    if (d.error) {
      var sug = (d.sugerencias||[]).map(function(s){ return '<li>'+s+'</li>'; }).join('');
      box.innerHTML = '<div style="color:var(--yellow)">'+d.error+'</div>'+(sug?'<ul style="margin:.5rem 0 0 1.2rem;color:var(--muted);font-size:.8rem">'+sug+'</ul>':'');
      return;
    }
    var rows = d.resultados || [];
    var tabla = '<div class="empty">Sin resultados.</div>';
    if (rows.length) {
      var cols = Object.keys(rows[0]);
      tabla = '<div style="overflow-x:auto"><table><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'+
        rows.map(function(row){ return '<tr>'+cols.map(function(c){
          var v = row[c]; if (v && typeof v === 'object') v = (v.low!==undefined? v.low : JSON.stringify(v));
          return '<td>'+(v==null?'':String(v).substring(0,60))+'</td>';
        }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
    }
    box.innerHTML =
      '<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.4rem;flex-wrap:wrap">'+
        '<span class="mini-pill" style="background:rgba(24,191,255,.15);color:var(--cyan)">motor: '+d.fuente+'</span>'+
        '<span class="mini-pill" style="background:rgba(188,140,255,.15);color:var(--purple)">'+d.intent+'</span>'+
        '<span style="color:var(--muted);font-size:.78rem">'+(d.explicacion||'')+'</span>'+
      '</div>'+
      '<pre style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.7rem;font-size:.74rem;color:var(--green);white-space:pre-wrap;margin-bottom:.5rem">'+
        d.cypher.replace(/</g,'&lt;')+'</pre>'+
      '<div style="font-size:.75rem;color:var(--muted);margin-bottom:.3rem">'+rows.length+' resultado(s):</div>'+tabla;
  }

  initCanvas();
  actualizarZoomLabel();
  recargarTodo();
</script>
</body>
</html>`;

// -----------------------------------------------------------------
// Rutas
// -----------------------------------------------------------------
router.get('/', (req, res) => res.send(HTML));

router.get('/api/stats', async (req, res) => {
    try { res.json(await grafo.estadisticas()); }
    catch (err) { res.json({ error: err.message }); }
});

router.get('/api/generos', async (req, res) => {
    try { res.json({ generos: await grafo.obrasPorGenero() }); }
    catch (err) { res.json({ generos: [], error: err.message }); }
});

router.get('/api/populares', async (req, res) => {
    try {
        const limite = parseInt(req.query.limite, 10) || 10;
        res.json({ obras: await grafo.obrasPopulares(limite) });
    } catch (err) { res.json({ obras: [], error: err.message }); }
});

router.get('/api/grafo', async (req, res) => {
    try { res.json({ edges: await grafo.grafoVisual(75) }); }
    catch (err) { res.json({ edges: [], error: err.message }); }
});

router.get('/api/recomendaciones', async (req, res) => {
    try {
        const usuario = parseInt(req.query.usuario, 10);
        const estrategia = req.query.estrategia || 'genero';
        const limite = parseInt(req.query.limite, 10) || 10;
        let recomendaciones;
        if (estrategia === 'artista') recomendaciones = await grafo.recomendarPorArtista(usuario, limite);
        else if (estrategia === 'colaborativo') recomendaciones = await grafo.recomendarColaborativo(usuario, limite);
        else recomendaciones = await grafo.recomendarPorGenero(usuario, limite);
        res.json({ recomendaciones });
    } catch (err) { res.json({ error: err.message }); }
});

router.post('/api/query', async (req, res) => {
    const { cypher } = req.body;
    if (!cypher) return res.status(400).json({ error: 'Cypher requerido' });
    try { res.json({ rows: await grafo.consultaLibre(cypher) }); }
    catch (err) { res.json({ error: err.message }); }
});

router.post('/api/clear', async (req, res) => {
    try { await grafo.borrarGrafo(); res.json({ message: 'Grafo borrado.' }); }
    catch (err) { res.json({ error: err.message }); }
});

// Reto +5%: lenguaje natural a Cypher (traduce y ejecuta, solo lectura)
router.post('/api/nl2cypher', async (req, res) => {
    try {
        const { pregunta, usuario_id } = req.body;
        if (!pregunta || !pregunta.trim()) return res.status(400).json({ error: 'Falta la pregunta' });
        const t = await nlToCypher.traducir(pregunta, { usuario_id });
        if (!t) {
            return res.json({
                error: 'No entendí la pregunta.',
                sugerencias: [
                    'Muéstrame obras del mismo género que compré',
                    'Recomiéndame del mismo artista que compré',
                    '¿Cuáles son las obras más compradas?',
                    'Pinturas disponibles de menos de 50000',
                ],
            });
        }
        const resultados = await grafo.consultaLibre(t.cypher, t.params);
        res.json({ ...t, total: resultados.length, resultados });
    } catch (err) { res.json({ error: err.message }); }
});

module.exports = router;
