const express = require('express');
const router  = express.Router();
const { getClient } = require('../config/cassandra');
const { topObras }  = require('../models/visitas');

const TABLAS_AUDIT = ['eventos_login','eventos_compra','eventos_admin','eventos_sistema'];

// Ultimos N meses como strings "YYYY-MM"
function ultimosMeses(n) {
    const meses = [];
    for (let i = 0; i < n; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return meses;
}

// -----------------------------------------------------------------
// HTML del panel
// -----------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cassandra Admin - Museo</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0d1117;--surface:#161b22;--surface2:#21262d;--border:#30363d;
      --red:#e94560;--blue:#58a6ff;--green:#3fb950;--yellow:#d29922;--purple:#bc8cff;
      --text:#e6edf3;--muted:#8b949e;
    }
    body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    header{background:var(--surface);padding:1rem 2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
    header h1{color:var(--red);font-size:1.3rem;font-weight:700}
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
    .stat-box:hover{border-color:var(--red);transform:translateY(-2px)}
    .stat-box .num{font-size:2.1rem;font-weight:700;line-height:1;margin-bottom:.3rem}
    .stat-box .lbl{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
    .stat-box .sub{font-size:.7rem;color:var(--muted);margin-top:.3rem}
    .bar-row{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}
    .bar-row .bar-label{width:90px;font-size:.8rem;text-align:right;color:var(--muted);flex-shrink:0}
    .bar-row .bar-track{flex:1;background:var(--surface2);border-radius:4px;height:18px;overflow:hidden}
    .bar-row .bar-fill{height:100%;border-radius:4px;transition:width .6s ease;display:flex;align-items:center;padding-left:6px;font-size:.7rem;color:#fff;font-weight:600}
    .bar-row .bar-val{width:70px;font-size:.8rem;text-align:right;color:var(--text);flex-shrink:0}
    table{width:100%;border-collapse:collapse;font-size:.82rem}
    th{background:var(--surface2);color:var(--muted);padding:.55rem .75rem;text-align:left;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border)}
    td{padding:.48rem .75rem;border-bottom:1px solid var(--border);vertical-align:middle}
    tr:hover td{background:rgba(255,255,255,.02)}
    .badge{display:inline-block;border-radius:4px;padding:1px 7px;font-size:.7rem;font-weight:700;letter-spacing:.5px}
    .badge-INFO{background:rgba(63,185,80,.15);color:var(--green);border:1px solid var(--green)}
    .badge-WARN{background:rgba(210,153,34,.15);color:var(--yellow);border:1px solid var(--yellow)}
    .badge-ERROR{background:rgba(233,69,96,.15);color:var(--red);border:1px solid var(--red)}
    .tabs{display:flex;gap:.4rem;margin-bottom:.8rem;flex-wrap:wrap}
    .tab{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.35rem .9rem;cursor:pointer;font-size:.8rem;transition:.15s}
    .tab:hover,.tab.active{background:var(--red);border-color:var(--red);color:#fff}
    .tab-panel{display:none}.tab-panel.active{display:block}
    textarea{width:100%;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.6rem;font-family:monospace;font-size:.82rem;resize:vertical;min-height:70px}
    .btn{background:var(--red);color:#fff;border:none;border-radius:6px;padding:.45rem 1.1rem;cursor:pointer;font-size:.82rem;transition:.15s}
    .btn:hover{opacity:.85}
    .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
    .btn-ghost:hover{border-color:var(--red);color:var(--red)}
    .btn-danger{background:#6e1c28}
    .btn-row{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem}
    #cql-result{margin-top:.8rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.8rem;font-size:.78rem;overflow:auto;white-space:pre-wrap;max-height:280px;display:none}
    .mini-pill{display:inline-block;border-radius:10px;padding:1px 8px;font-size:.7rem;font-weight:600}
    .empty{color:var(--muted);padding:.8rem;font-size:.85rem}
    .trend-up{color:var(--green)}.trend-dn{color:var(--red)}.trend-eq{color:var(--muted)}
    details summary{cursor:pointer;color:var(--blue);font-size:.78rem}
    details pre{font-size:.72rem;margin-top:.3rem;color:var(--muted);white-space:pre-wrap;word-break:break-all}
    @media(max-width:800px){.grid5,.grid2{grid-template-columns:1fr}}
  </style>
</head>
<body>

<header>
  <div>
    <h1>Cassandra Admin - Museo de Arte</h1>
    <div class="meta">keyspace: museo_auditoria &nbsp;|&nbsp; <span id="last-update">cargando...</span></div>
  </div>
  <div style="display:flex;gap:.5rem;align-items:center">
    <label style="font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:.4rem;cursor:pointer">
      <input type="checkbox" id="autoRefresh" style="accent-color:var(--red)"> Auto-refresh 30s
    </label>
    <button class="refresh-btn" onclick="recargarTodo()">Actualizar</button>
  </div>
</header>

<div class="container">

  <!-- -- Stat cards -- -->
  <div class="card">
    <div class="card-title">Resumen global</div>
    <div class="grid5">
      <div class="stat-box"><div class="num" id="cnt-total" style="color:var(--red)">-</div><div class="lbl">Total eventos</div></div>
      <div class="stat-box"><div class="num" id="cnt-login"  style="color:var(--blue)">-</div><div class="lbl">Login</div><div class="sub" id="sub-login"></div></div>
      <div class="stat-box"><div class="num" id="cnt-compra" style="color:var(--green)">-</div><div class="lbl">Compras</div><div class="sub" id="sub-compra"></div></div>
      <div class="stat-box"><div class="num" id="cnt-admin"  style="color:var(--yellow)">-</div><div class="lbl">Admin</div><div class="sub" id="sub-admin"></div></div>
      <div class="stat-box"><div class="num" id="cnt-sistema" style="color:var(--purple)">-</div><div class="lbl">Sistema</div><div class="sub" id="sub-sistema"></div></div>
    </div>
  </div>

  <!-- -- Distribucion + Mensual -- -->
  <div class="grid2">

    <div class="card">
      <div class="card-title">Distribucion por tipo</div>
      <div id="dist-chart"><div class="empty">Cargando...</div></div>
    </div>

    <div class="card">
      <div class="card-title">Actividad ultimos 6 meses</div>
      <div style="overflow-x:auto">
        <table id="mensual-table">
          <thead><tr><th>Mes</th><th style="color:var(--blue)">Login</th><th style="color:var(--green)">Compras</th><th style="color:var(--yellow)">Admin</th><th style="color:var(--purple)">Sistema</th></tr></thead>
          <tbody id="mensual-body"><tr><td colspan="5" class="empty">Cargando...</td></tr></tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- -- Top usuarios + Top obras -- -->
  <div class="grid2">

    <div class="card">
      <div class="card-title">Top 10 usuarios mas activos (ultimos 3 meses)</div>
      <div id="top-usuarios"><div class="empty">Cargando...</div></div>
    </div>

    <div class="card">
      <div class="card-title">Top 10 obras mas visitadas</div>
      <div id="top-obras"><div class="empty">Cargando...</div></div>
    </div>

  </div>

  <!-- -- Eventos por tabla -- -->
  <div class="card">
    <div class="card-title">Eventos recientes por categoria</div>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.8rem">
      <div class="tabs" style="margin-bottom:0">
        <button class="tab active" onclick="switchTab('login')">Login</button>
        <button class="tab"        onclick="switchTab('compra')">Compras</button>
        <button class="tab"        onclick="switchTab('admin')">Admin</button>
        <button class="tab"        onclick="switchTab('sistema')">Sistema</button>
      </div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <label style="font-size:.78rem;color:var(--muted)">Mes:</label>
        <select id="mes-filtro" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.3rem .6rem;font-size:.8rem;cursor:pointer">
          <option value="">Todos los meses</option>
        </select>
      </div>
    </div>
    <div id="tab-login"   class="tab-panel active"><div class="empty">Cargando...</div></div>
    <div id="tab-compra"  class="tab-panel"><div class="empty">Cargando...</div></div>
    <div id="tab-admin"   class="tab-panel"><div class="empty">Cargando...</div></div>
    <div id="tab-sistema" class="tab-panel"><div class="empty">Cargando...</div></div>
  </div>

  <!-- -- CQL libre -- -->
  <div class="card">
    <div class="card-title">Consola CQL</div>
    <div class="btn-row">
      <button class="btn btn-ghost" onclick="setQ('SELECT * FROM museo_auditoria.eventos_login LIMIT 50;')">Logins recientes</button>
      <button class="btn btn-ghost" onclick="setQ('SELECT * FROM museo_auditoria.eventos_compra LIMIT 50;')">Compras recientes</button>
      <button class="btn btn-ghost" onclick="setQ('SELECT * FROM museo_auditoria.eventos_admin LIMIT 50;')">Acciones admin</button>
      <button class="btn btn-ghost" onclick="setQ('SELECT * FROM museo_auditoria.eventos_sistema LIMIT 50;')">Errores sistema</button>
      <button class="btn btn-ghost" onclick="setQ('SELECT COUNT(*) FROM museo_auditoria.visitas_totales;')">Total visitas</button>
      <button class="btn btn-danger" style="margin-left:auto" onclick="clearLogs()">Borrar todos los logs</button>
    </div>
    <textarea id="cql" rows="3" placeholder="SELECT * FROM museo_auditoria.eventos_login LIMIT 10;"></textarea>
    <div style="margin-top:.6rem;display:flex;gap:.5rem">
      <button class="btn" onclick="runCQL()">Ejecutar</button>
      <button class="btn btn-ghost" onclick="document.getElementById('cql-result').style.display='none'">Limpiar resultado</button>
    </div>
    <div id="cql-result"></div>
  </div>

</div><!-- /container -->

<script>
  const TABS     = ['login','compra','admin','sistema'];
  const TABLA_MAP = { login:'eventos_login', compra:'eventos_compra', admin:'eventos_admin', sistema:'eventos_sistema' };
  const COLORS   = { login:'#58a6ff', compra:'#3fb950', admin:'#d29922', sistema:'#bc8cff' };

  // -- Poblar selector de meses --
  (function() {
    var sel = document.getElementById('mes-filtro');
    var now = new Date();
    for (var i = 0; i < 6; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var val = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      var nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = nombres[d.getMonth()] + ' ' + d.getFullYear();
      if (i === 0) opt.selected = true;
      sel.appendChild(opt);
    }
  })();

  document.getElementById('mes-filtro').addEventListener('change', function() {
    TABS.forEach(function(t) { loadTab(t); });
  });

  // -- Tabs --
  function switchTab(name) {
    TABS.forEach(function(t) {
      document.getElementById('tab-'+t).classList.toggle('active', t===name);
    });
    document.querySelectorAll('.tab').forEach(function(btn, i) {
      btn.classList.toggle('active', TABS[i] === name);
    });
  }

  // -- Render tabla de eventos --
  function renderEventos(rows) {
    if (!rows || rows.length === 0) return '<p class="empty">Sin eventos.</p>';
    var cols = ['timestamp','tipo_evento','usuario','severidad','ip','metadata'];
    var html = '<div style="overflow-x:auto"><table><thead><tr>';
    cols.forEach(function(c){ html += '<th>'+c+'</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function(row) {
      html += '<tr>';
      cols.forEach(function(c) {
        var v = row[c] != null ? row[c] : '';
        if (c === 'severidad') {
          html += '<td><span class="badge badge-'+v+'">'+v+'</span></td>';
        } else if (c === 'timestamp') {
          html += '<td style="color:var(--muted);font-size:.75rem">'+String(v).replace('T',' ').substring(0,19)+'</td>';
        } else if (c === 'metadata' && v && v !== '{}') {
          try { v = JSON.stringify(JSON.parse(v), null, 2); } catch(e){}
          html += '<td><details><summary>ver</summary><pre>'+v+'</pre></details></td>';
        } else if (c === 'usuario') {
          html += '<td style="color:var(--blue)">'+String(v).substring(0,50)+'</td>';
        } else {
          html += '<td>'+String(v).substring(0,70)+'</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  // -- Stats globales --
  async function loadStats() {
    var r = await fetch('/admin/api/stats');
    var d = await r.json();
    var total = 0;
    ['login','compra','admin','sistema'].forEach(function(k) {
      var n = parseInt(d['eventos_'+k]) || 0;
      total += n;
      document.getElementById('cnt-'+k).textContent = n.toLocaleString();
    });
    document.getElementById('cnt-total').textContent = total.toLocaleString();
    renderDist(d, total);
  }

  // -- Distribucion --
  function renderDist(d, total) {
    var items = [
      { key:'login',   label:'Login',   color:COLORS.login   },
      { key:'compra',  label:'Compras', color:COLORS.compra  },
      { key:'admin',   label:'Admin',   color:COLORS.admin   },
      { key:'sistema', label:'Sistema', color:COLORS.sistema },
    ];
    var html = '';
    items.forEach(function(it) {
      var n   = parseInt(d['eventos_'+it.key]) || 0;
      var pct = total > 0 ? Math.max(1, Math.round(n/total*100)) : 0;
      html += '<div class="bar-row">';
      html += '<span class="bar-label">'+it.label+'</span>';
      html += '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:'+it.color+'">'+pct+'%</div></div>';
      html += '<span class="bar-val">'+n.toLocaleString()+'</span>';
      html += '</div>';
    });
    document.getElementById('dist-chart').innerHTML = html;
  }

  // -- Actividad mensual --
  async function loadMensual() {
    var r = await fetch('/admin/api/mensual');
    var d = await r.json();
    if (!d.meses) return;
    var tbody = document.getElementById('mensual-body');
    var rows  = '';
    d.meses.forEach(function(m, i) {
      var trend = '';
      if (i < d.meses.length - 1) {
        var prev = d.meses[i+1].total;
        if (m.total > prev)      trend = '<span class="trend-up"> +</span>';
        else if (m.total < prev) trend = '<span class="trend-dn"> -</span>';
        else                     trend = '<span class="trend-eq"> =</span>';
      }
      rows += '<tr>';
      rows += '<td style="font-weight:600">'+m.mes+trend+'</td>';
      rows += '<td style="color:'+COLORS.login+'">'+m.login.toLocaleString()+'</td>';
      rows += '<td style="color:'+COLORS.compra+'">'+m.compra.toLocaleString()+'</td>';
      rows += '<td style="color:'+COLORS.admin+'">'+m.admin.toLocaleString()+'</td>';
      rows += '<td style="color:'+COLORS.sistema+'">'+m.sistema.toLocaleString()+'</td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows || '<tr><td colspan="5" class="empty">Sin datos</td></tr>';
  }

  // -- Top usuarios --
  async function loadTopUsuarios() {
    var r  = await fetch('/admin/api/top-usuarios');
    var d  = await r.json();
    var el = document.getElementById('top-usuarios');
    if (!d.usuarios || d.usuarios.length === 0) {
      el.innerHTML = '<div class="empty">Sin datos disponibles.</div>'; return;
    }
    var max  = d.usuarios[0].total || 1;
    var html = '<table><thead><tr><th>#</th><th>Usuario</th><th>Eventos</th><th style="width:120px">Actividad</th></tr></thead><tbody>';
    d.usuarios.forEach(function(u, i) {
      var pct = Math.round(u.total/max*100);
      html += '<tr>';
      html += '<td style="color:var(--muted);width:32px">'+(i+1)+'</td>';
      html += '<td style="color:var(--blue);font-size:.78rem">'+u.usuario+'</td>';
      html += '<td><strong>'+u.total.toLocaleString()+'</strong></td>';
      html += '<td><div style="background:var(--surface2);border-radius:3px;height:10px"><div style="background:var(--blue);width:'+pct+'%;height:100%;border-radius:3px"></div></div></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // -- Top obras --
  async function loadTopObras() {
    var r  = await fetch('/admin/api/visitas/top?limite=10');
    var d  = await r.json();
    var el = document.getElementById('top-obras');
    if (!d.obras || d.obras.length === 0) {
      el.innerHTML = '<div class="empty">Sin visitas registradas.</div>'; return;
    }
    var max  = d.obras[0].total || 1;
    var html = '<table><thead><tr><th>#</th><th>Obra ID</th><th>Visitas</th><th style="width:100px">Barra</th></tr></thead><tbody>';
    d.obras.forEach(function(o, i) {
      var pct = Math.round(o.total/max*100);
      html += '<tr>';
      html += '<td style="color:var(--muted);width:32px">'+(i+1)+'</td>';
      html += '<td style="font-size:.72rem;color:var(--muted)">'+o.obra_id.substring(0,24)+'</td>';
      html += '<td><strong>'+o.total.toLocaleString()+'</strong></td>';
      html += '<td><div style="background:var(--surface2);border-radius:3px;height:10px"><div style="background:var(--red);width:'+pct+'%;height:100%;border-radius:3px"></div></div></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  // -- Eventos por tab --
  async function loadTab(name) {
    var tabla = TABLA_MAP[name];
    var mes   = document.getElementById('mes-filtro').value;
    var url   = '/admin/api/events?tabla=' + tabla + (mes ? '&mes=' + mes : '');
    document.getElementById('tab-'+name).innerHTML = '<div class="empty">Cargando...</div>';
    var r = await fetch(url);
    var d = await r.json();
    document.getElementById('tab-'+name).innerHTML = renderEventos(d.rows);
  }

  // -- CQL --
  function setQ(q) {
    document.getElementById('cql').value = q;
    runCQL();
  }

  async function runCQL() {
    var res = document.getElementById('cql-result');
    var cql = document.getElementById('cql').value.trim();
    res.style.display = 'block';
    res.textContent   = 'Ejecutando...';
    var r = await fetch('/admin/api/query', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ cql: cql })
    });
    var d = await r.json();
    res.textContent = d.error ? 'Error: '+d.error : JSON.stringify(d.rows, null, 2);
  }

  async function clearLogs() {
    if (!confirm('Borrar TODOS los logs? Esta accion no se puede deshacer.')) return;
    var res = document.getElementById('cql-result');
    res.style.display = 'block';
    res.textContent   = 'Borrando...';
    var r = await fetch('/admin/api/clear-logs', { method:'POST' });
    var d = await r.json();
    res.textContent = d.error ? 'Error: '+d.error : d.message;
    recargarTodo();
  }

  // -- Recarga completa --
  async function recargarTodo() {
    document.getElementById('last-update').textContent = 'actualizando...';
    await Promise.all([
      loadStats(), loadMensual(), loadTopUsuarios(), loadTopObras(),
      loadTab('login'), loadTab('compra'), loadTab('admin'), loadTab('sistema'),
    ]);
    document.getElementById('last-update').textContent =
      'actualizado: ' + new Date().toLocaleTimeString('es');
  }

  // -- Auto-refresh --
  var _timer = null;
  document.getElementById('autoRefresh').addEventListener('change', function(e) {
    if (e.target.checked) {
      _timer = setInterval(recargarTodo, 30000);
    } else {
      clearInterval(_timer);
    }
  });

  recargarTodo();
</script>
</body>
</html>`;

// -----------------------------------------------------------------
// Rutas
// -----------------------------------------------------------------
router.get('/', (req, res) => res.send(HTML));

router.get('/api/stats', async (req, res) => {
    const stats = {};
    try {
        const client = getClient();
        await client.connect();
        for (const tabla of TABLAS_AUDIT) {
            try {
                const r = await client.execute(`SELECT COUNT(*) FROM museo_auditoria.${tabla}`);
                stats[tabla] = r.rows[0]['count'].toString();
            } catch { stats[tabla] = '0'; }
        }
    } catch (err) { return res.json({ error: err.message }); }
    res.json(stats);
});

// Actividad por mes (ultimos 6 meses, 1 query por tabla por mes)
router.get('/api/mensual', async (req, res) => {
    try {
        const client = getClient();
        await client.connect();
        const meses  = ultimosMeses(6);
        const result = [];

        for (const mes of meses) {
            const entry = { mes, login: 0, compra: 0, admin: 0, sistema: 0, total: 0 };
            const queries = [
                client.execute('SELECT COUNT(*) FROM eventos_login   WHERE mes = ?', [mes], { prepare: true }),
                client.execute('SELECT COUNT(*) FROM eventos_compra  WHERE mes = ?', [mes], { prepare: true }),
                client.execute('SELECT COUNT(*) FROM eventos_admin   WHERE mes = ?', [mes], { prepare: true }),
                client.execute('SELECT COUNT(*) FROM eventos_sistema WHERE mes = ?', [mes], { prepare: true }),
            ];
            const [rL, rC, rA, rS] = await Promise.all(queries);
            entry.login   = Number(rL.rows[0].count) || 0;
            entry.compra  = Number(rC.rows[0].count) || 0;
            entry.admin   = Number(rA.rows[0].count) || 0;
            entry.sistema = Number(rS.rows[0].count) || 0;
            entry.total   = entry.login + entry.compra + entry.admin + entry.sistema;
            result.push(entry);
        }
        res.json({ meses: result });
    } catch (err) { res.json({ meses: [], error: err.message }); }
});

// Top usuarios (agrega eventos_login de los ultimos 3 meses)
router.get('/api/top-usuarios', async (req, res) => {
    try {
        const client = getClient();
        await client.connect();
        const meses  = ultimosMeses(3);
        const conteo = {};

        for (const mes of meses) {
            const r = await client.execute(
                'SELECT usuario FROM eventos_login WHERE mes = ? LIMIT 2000',
                [mes], { prepare: true }
            );
            for (const row of r.rows) {
                const u = row.usuario || '';
                conteo[u] = (conteo[u] || 0) + 1;
            }
        }

        const usuarios = Object.entries(conteo)
            .map(([usuario, total]) => ({ usuario, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        res.json({ usuarios });
    } catch (err) { res.json({ usuarios: [], error: err.message }); }
});

router.get('/api/events', async (req, res) => {
    const tabla = req.query.tabla || 'eventos_login';
    const mes   = req.query.mes || '';
    if (!TABLAS_AUDIT.includes(tabla)) return res.status(400).json({ error: 'Tabla invalida' });
    if (mes && !/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Formato mes invalido (YYYY-MM)' });
    try {
        const client = getClient();
        await client.connect();
        const r = mes
            ? await client.execute(`SELECT * FROM museo_auditoria.${tabla} WHERE mes = ? LIMIT 100`, [mes], { prepare: true })
            : await client.execute(`SELECT * FROM museo_auditoria.${tabla} LIMIT 50`);
        res.json({ rows: r.rows.map(row => {
            const obj = {};
            for (const [k, v] of Object.entries(row)) {
                obj[k] = v instanceof Date ? v.toISOString() : String(v ?? '');
            }
            return obj;
        })});
    } catch (err) { res.json({ rows: [], error: err.message }); }
});

router.post('/api/clear-logs', async (req, res) => {
    try {
        const client = getClient();
        await client.connect();
        for (const tabla of TABLAS_AUDIT) {
            await client.execute(`TRUNCATE museo_auditoria.${tabla}`);
        }
        try { await client.execute('TRUNCATE museo_auditoria.eventos_auditoria'); } catch {}
        res.json({ message: 'Todos los logs eliminados correctamente.' });
    } catch (err) { res.json({ error: err.message }); }
});

router.get('/api/visitas/top', async (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 10;
        res.json({ obras: await topObras(limite) });
    } catch (err) { res.json({ obras: [], error: err.message }); }
});

router.post('/api/query', async (req, res) => {
    const { cql } = req.body;
    if (!cql) return res.status(400).json({ error: 'CQL requerido' });
    try {
        const client = getClient();
        await client.connect();
        const r = await client.execute(cql);
        res.json({ rows: r.rows || [], columns: r.columns || [] });
    } catch (err) { res.json({ error: err.message }); }
});

module.exports = router;
