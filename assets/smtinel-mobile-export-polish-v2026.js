/* SMTinel Mobile Export Polish V20.26.1
   Runtime-only UI cleanup for phone width: hides non-useful top chips and compresses Export Center vertical space.
   It does not touch loaded production data, ZIP import behavior, or report payloads. */
(function () {
  'use strict';
  if (window.__SMTINEL_MOBILE_EXPORT_POLISH__) return;
  window.__SMTINEL_MOBILE_EXPORT_POLISH__ = true;

  var css = `
@media (max-width: 780px) {
  html.smt-mobile-export-polish, body.smt-mobile-export-polish {
    overflow-x: hidden !important;
  }
  body.smt-mobile-export-polish [data-smt-mobile-hidden-chip="1"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  body.smt-mobile-export-polish [data-smt-mobile-compress="1"] {
    min-height: auto !important;
    height: auto !important;
    max-height: none !important;
    padding-bottom: 8px !important;
    margin-bottom: 0 !important;
  }
  body.smt-mobile-export-polish [data-smt-export-root="1"] {
    min-height: auto !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important;
    margin-bottom: 0 !important;
  }
  body.smt-mobile-export-polish [data-smt-export-shell="1"] {
    min-height: auto !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    background: transparent !important;
  }
  body.smt-mobile-export-polish [data-smt-report-card="1"] {
    min-height: 0 !important;
    margin: 10px 12px !important;
    padding: 20px 18px !important;
    border-radius: 18px !important;
  }
  body.smt-mobile-export-polish [data-smt-report-card="1"] h1,
  body.smt-mobile-export-polish [data-smt-report-card="1"] h2,
  body.smt-mobile-export-polish [data-smt-report-card="1"] h3 {
    font-size: clamp(20px, 6vw, 28px) !important;
    line-height: 1.12 !important;
    margin-bottom: 8px !important;
  }
  body.smt-mobile-export-polish [data-smt-report-card="1"] p {
    font-size: clamp(14px, 4.6vw, 22px) !important;
    line-height: 1.42 !important;
    margin-top: 6px !important;
  }
  body.smt-mobile-export-polish [data-smt-export-title="1"] {
    padding-top: 18px !important;
    margin-top: 0 !important;
  }
  body.smt-mobile-export-polish [data-smt-bottom-version="1"] {
    transform: translateY(-4px) !important;
  }
}`;
  var style = document.createElement('style');
  style.id = 'smtinel-mobile-export-polish-style';
  style.textContent = css;
  document.head.appendChild(style);

  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width: 780px)').matches;
  }
  function txt(el) {
    return String((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
  }
  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function topBand(el) {
    if (!visible(el)) return false;
    var r = el.getBoundingClientRect();
    return r.top >= -12 && r.bottom <= 190;
  }
  function closestControl(el) {
    return (el.closest && el.closest('button,a,[role="button"],[class*="chip"],[class*="pill"],[class*="badge"],[class*="toggle"],[class*="control"]')) || el;
  }
  function hideMobileTopChips() {
    if (!isMobile()) return;
    document.documentElement.classList.add('smt-mobile-export-polish');
    document.body.classList.add('smt-mobile-export-polish');
    var banned = /^(production|producción|idioma|es|en|local|cargar zip|load zip|\.\.\.|⋯|⋮)$/i;
    var comboBanned = /^(idioma\s+)?(es|en)$|^production$|^local$|cargar\s+zip|load\s+zip/i;
    Array.prototype.forEach.call(document.querySelectorAll('button,a,[role="button"],span,div'), function (el) {
      if (!topBand(el)) return;
      var t = txt(el);
      if (!t || t.length > 42) return;
      if (/light|dark|tema|theme|☀|🌙|☾|☼/i.test(t)) return;
      if (/^☰$|^≡$|^menu$/i.test(t)) return;
      if (banned.test(t) || comboBanned.test(t)) {
        var target = closestControl(el);
        if (target && topBand(target)) target.setAttribute('data-smt-mobile-hidden-chip', '1');
      }
    });
  }
  function climbUsefulRoot(start) {
    var node = start;
    var best = start;
    for (var i = 0; node && i < 9; i += 1, node = node.parentElement) {
      if (!node.getBoundingClientRect) continue;
      var r = node.getBoundingClientRect();
      var text = txt(node);
      if (r.width >= Math.min(320, window.innerWidth * 0.75) && /Export Center|Genera el reporte que necesitas|Entrega de turno|Reporte semanal/i.test(text)) {
        best = node;
      }
    }
    return best;
  }
  function markExportCenter() {
    if (!isMobile()) return;
    var marker = null;
    Array.prototype.some.call(document.querySelectorAll('h1,h2,h3,h4,div,section,main'), function (el) {
      var t = txt(el);
      if (/^Export Center$/i.test(t) || /Genera el reporte que necesitas/i.test(t)) {
        marker = el;
        return true;
      }
      return false;
    });
    if (!marker) return;
    var root = climbUsefulRoot(marker);
    if (root) root.setAttribute('data-smt-export-root', '1');
    var node = root;
    for (var i = 0; node && i < 5; i += 1, node = node.parentElement) {
      node.setAttribute('data-smt-export-shell', '1');
      if (node.getBoundingClientRect && node.getBoundingClientRect().height > window.innerHeight * 0.7) {
        node.setAttribute('data-smt-mobile-compress', '1');
      }
    }
    Array.prototype.forEach.call(document.querySelectorAll('h1,h2,h3,h4'), function (h) {
      var t = txt(h);
      if (/Entrega de turno|Reporte semanal|Seguimiento DBN|Desempeño de pruebas|Matriz Yokoten|calificación de manufactura/i.test(t)) {
        var card = h.closest && h.closest('article,section,[class*="card"],div');
        if (card) card.setAttribute('data-smt-report-card', '1');
      }
      if (/Genera el reporte que necesitas/i.test(t)) h.setAttribute('data-smt-export-title', '1');
    });
    Array.prototype.forEach.call(document.querySelectorAll('span,div'), function (el) {
      if (/SMTinel V20\./i.test(txt(el)) && topBand(el) === false) el.setAttribute('data-smt-bottom-version', '1');
    });
  }
  function apply() {
    hideMobileTopChips();
    markExportCenter();
  }
  var timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  try {
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (err) {
    setInterval(apply, 1500);
  }
}());


/* Yokoten run matrix: shared desktop/mobile renderer and explicit mobile saving. */
(function () {
  'use strict';
  var VERSION = 'smtinel-yokoten-runs-v3';
  var seen = new WeakSet();
  var LOGO = 'data:image/png;base64,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';
  function palette(dark) {
    return dark
      ? '--yk-page:#17181b;--yk-paper:#24262b;--yk-soft:#303239;--yk-text:#ffffff;--yk-muted:#d3d5db;--yk-border:#62656e;--yk-accent:#ff8195;'
      : '--yk-page:#f5f5f7;--yk-paper:#ffffff;--yk-soft:#f2f2f5;--yk-text:#202124;--yk-muted:#61656d;--yk-border:#dcdde1;--yk-accent:#c8102e;';
  }
  // One schema and renderer for desktop, mobile, preview and standalone export.
  // Only WO-level run metadata is read; station/serial histories are never read.
  function runCore() {
    function text(v) { return String(v == null ? '' : v).trim(); }
    function norm(v) { return text(v).toUpperCase(); }
    function pn(v) { return norm(v).replace(/\s+/g, ''); }
    function esc(v) { return text(v).replace(/[&<>"'=]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '=': '&#61;' }[c]; }); }
    function line(v) { var m = norm(v).match(/^L\s*0*(\d+)$/); return m ? 'L' + Number(m[1]) : norm(v); }
    function order(a, b) { return text(a).localeCompare(text(b), 'es', { numeric: true, sensitivity: 'base' }); }
    function unique(a) { return Array.from(new Set(a)).sort(order); }
    function day(v) {
      var m = text(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
      if (!m) return '';
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[1] + '-' + m[2] + '-' + m[3] : '';
    }
    function dateLabel(v) {
      if (!day(v)) return 'Inicio no disponible';
      var date = v.slice(0, 10).split('-');
      return date[2] + '/' + date[1] + '/' + date[0] + (v.length > 10 ? ' · ' + v.slice(11, 16) : '');
    }
    function filter(runs, filters, except) {
      return runs.filter(function (r) {
        var dimensions = ['bu', 'line', 'model', 'sku', 'rev', 'wo'];
        if (dimensions.some(function (k) { return k !== except && filters[k] && r[k] !== filters[k]; })) return false;
        var terms = norm(filters.q).split(/\s+/).filter(Boolean), hay = norm([r.bu, r.model, r.sku, r.rev, r.line, r.wo].join(' '));
        if (terms.some(function (q) { return hay.indexOf(q) < 0; })) return false;
        var date = day(r.start);
        if (filters.period === 'undated') return !date;
        if (filters.period && filters.period !== 'all') return !!date && !!day(filters.from) && !!day(filters.to) && filters.from <= filters.to && date >= filters.from && date <= filters.to;
        return true;
      });
    }
    function group(runs) {
      var map = new Map();
      runs.forEach(function (r) {
        var key = JSON.stringify([r.bu, r.model, r.sku, r.rev]);
        if (!map.has(key)) map.set(key, { bu: r.bu, model: r.model, sku: r.sku, rev: r.rev, cells: Object.create(null) });
        var row = map.get(key);
        (row.cells[r.line] || (row.cells[r.line] = [])).push(r);
      });
      return Array.from(map.values()).sort(function (a, b) { return order(a.bu, b.bu) || order(a.model, b.model) || order(a.sku, b.sku) || order(a.rev, b.rev); });
    }
    function matrix(rows, lines) {
      if (!rows.length) return '<div class="yk-empty">No hay corridas que coincidan con los filtros.</div>';
      return '<table class="yk-matrix"><caption class="yk-sr">Matriz de corridas por BU, modelo, revisión y línea</caption><thead><tr><th scope="col" class="yk-product">BU · Modelo / SKU / Revisión</th>' + lines.map(function (l) { return '<th scope="col">' + esc(l) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (row) {
        return '<tr><th scope="row" class="yk-product"><span class="yk-bu">' + esc(row.bu) + '</span><b>' + esc(row.model) + '</b><small>' + esc(row.sku) + '</small><small>Rev ' + esc(row.rev) + '</small></th>' + lines.map(function (l) {
          var runs = (row.cells[l] || []).slice().sort(function (a, b) { return order(b.start, a.start) || order(a.wo, b.wo); });
          if (!runs.length) return '<td class="yk-no-run" aria-label="Sin corrida en el periodo">—</td>';
          var first = runs[0];
          return '<td data-line="' + esc(l) + '"><details class="yk-cell"><summary><span class="yk-cell-line">' + esc(l) + '</span><span class="yk-caption">' + (runs.length > 1 ? 'Inicio más reciente' : 'Inicio de corrida') + '</span><strong>' + esc(dateLabel(first.start)) + '</strong><span class="yk-caption">' + (runs.length > 1 ? runs.length + ' corridas · Ver WO' : 'WO ' + esc(first.wo)) + '</span>' + '</summary><div class="yk-run-list">' + runs.map(function (r) {
            return '<div class="yk-run"><b>WO ' + esc(r.wo) + '</b><span>' + esc(dateLabel(r.start)) + '</span>' + (!r.start && r.startRaw ? '<small>Fecha fuente no reconocida: ' + esc(r.startRaw) + '</small>' : '') + '</div>';
          }).join('') + '</div></details></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    }
    return { text: text, norm: norm, pn: pn, esc: esc, line: line, order: order, unique: unique, day: day, dateLabel: dateLabel, filter: filter, group: group, matrix: matrix };
  }
  var core = runCore();
  function escapeHtml(v) { return core.esc(v); }
  function number(v) { return Number(v || 0).toLocaleString('es-MX'); }
  function pick(row, fields) {
    var keys = Object.keys(row || {}), values = Object.create(null);
    keys.forEach(function (k) { values[core.norm(k).replace(/[^A-Z0-9]/g, '')] = k; });
    for (var i = 0; i < fields.length; i++) {
      var key = values[core.norm(fields[i]).replace(/[^A-Z0-9]/g, '')], value = key == null ? '' : row[key];
      if (value != null && core.text(value)) return value;
    }
    return '';
  }
  function startDate(value) {
    if (value == null || value === '') return '';
    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (!isNaN(value.getTime())) return value.toISOString().slice(0, 19).replace('T', ' ');
      return '';
    }
    var raw = core.text(value);
    if (/^\d+(?:\.\d+)?$/.test(raw) && +raw > 20000 && +raw < 90000) {
      var excel = new Date(Math.round((+raw - 25569) * 86400000));
      return excel.toISOString().slice(0, +raw % 1 ? 19 : 10).replace('T', ' ');
    }
    // Source wall clock is retained. Explicit UTC/offset timestamps are shown
    // in the plant timezone; filtering must not depend on the viewer's timezone.
    if (/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(raw)) {
      var zoned = new Date(raw);
      if (isNaN(zoned.getTime())) return '';
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Ciudad_Juarez', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(zoned), p = {};
      parts.forEach(function (x) { p[x.type] = x.value; });
      return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
    }
    var m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(AM|PM)?)?$/i);
    if (!m) {
      var us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
      if (us) m = [us[0], us[3], us[1], us[2], us[4], us[5], us[6], us[7]];
    }
    if (!m) return '';
    var date = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    if (!core.day(date)) return '';
    if (m[4] == null) return date;
    var hour = +m[4], min = +m[5], sec = +(m[6] || 0);
    if (m[7]) { if (hour < 1 || hour > 12) return ''; hour = hour % 12 + (/PM/i.test(m[7]) ? 12 : 0); }
    if (hour > 23 || min > 59 || sec > 59) return '';
    return date + ' ' + String(hour).padStart(2, '0') + ':' + m[5] + ':' + String(sec).padStart(2, '0');
  }
  function buildRunSnapshot(w) {
    var P = w.SMTINEL_CROSSMODEL_LAST_PARSED || w.TRACEOPS_YIELD_LAST_PARSED || w.SMTINEL_LAST_PARSED || {};
    var work = Array.isArray(P.wo) ? P.wo : (w.TRACEOPS_YIELD_RAW_STATION_ON_LINE_ROWS || []);
    var catalog = Array.isArray(P.dbmodel) ? P.dbmodel : [], db = new Map(), groups = new Map(), skipped = 0;
    var skuFields = ['P_NO', 'skuno', 'SkuNo', 'SKU', 'Part Number', 'PN', 'Product Number', 'Number Model', 'Model Number', 'Model', 'Modelo'];
    var modelFields = ['Product Family', 'Prodcut Family', 'ProductFamily', 'Product Family Name', 'Model Name', 'ModelName', 'MODEL_NAME', 'Nombre del Modelo', 'Nombre Modelo', 'Family', 'Product', 'UUTTYPE', 'UUT Type Name', 'UUT Type Description', 'CODENAME', 'Code Name', 'Description', 'Descripcion', 'Descripción'];
    var buFields = ['BU', 'Business Unit', 'BU Name', 'BusinessUnit', 'Unidad Negocio', 'Unidad de Negocio', 'Division', 'División'];
    function present(value) { return !/^(?:N\/?[AD]|UNKNOWN|UNASSIGNED)$/i.test(core.text(value)) ? core.text(value) : ''; }
    function uniqueValue(list, key) { var values = core.unique(list.map(function (r) { return r[key]; }).filter(Boolean)); return values.length === 1 ? values[0] : ''; }
    catalog.forEach(function (r) {
      var sku = core.pn(pick(r, skuFields));
      if (!sku) return;
      if (!db.has(sku)) db.set(sku, []);
      db.get(sku).push({ bu: core.norm(present(pick(r, buFields))), model: present(pick(r, modelFields)) });
    });
    work.forEach(function (r) {
      var wo = core.text(pick(r, ['Work Orde 00000', 'WorkOrderNo', 'Work Order', 'Work Order to search', 'WO Number', 'WO NO', 'WO_NO', 'WO', 'WorkOrder', 'Orden', 'Order'])).replace(/\.0+$/, '').replace(/\s+/g, '');
      if (!wo) { skipped++; return; }
      var sku = present(pick(r, skuFields)) || 'N/D', matches = db.get(core.pn(sku)) || [];
      var model = present(pick(r, modelFields)) || uniqueValue(matches, 'model');
      if (!model) { var candidate = present(pick(r, ['Model', 'Modelo'])); if (core.pn(candidate) !== core.pn(sku)) model = candidate; }
      var bu = core.norm(present(pick(r, buFields))) || uniqueValue(matches, 'bu') || 'Sin BU';
      var rev = core.norm(present(pick(r, ['P_VERSION', 'P Version', 'Version', 'Revision', 'REV']))) || 'N/D';
      var line = core.line(present(pick(r, ['Line ID', 'Line', 'Linea', 'Línea', 'Production Line', 'productionLine', 'production_line', 'SMT Line']))) || 'Sin línea';
      var raw = pick(r, ['Time Start', 'Start Time', 'WO Start Time', 'Build Start Time', 'Build Start Date', 'Build Start Date (Month)', 'Start Date', 'Date', 'Fecha Inicio', 'Fecha']);
      var start = startDate(raw), run = { bu: bu, model: model || 'Modelo no disponible', sku: sku, rev: rev, line: line, wo: wo, start: start };
      if (!start && core.text(raw)) run.startRaw = core.text(raw);
      var key = JSON.stringify([bu, core.norm(run.model), core.pn(sku), rev, line, wo.replace(/^0+(?=\d)/, '')]);
      var old = groups.get(key);
      // One corrida per WO/line/model/revision, even when the source repeats the
      // row for stations. The earliest valid start is the beginning of that run.
      if (!old || (start && (!old.start || start < old.start))) groups.set(key, run);
    });
    return { schema: 'smtinel.yokoten.runs.v3', generated: new Date().toISOString(), source: 'Common DB · Station_on_line_report + DB_Model', runs: Array.from(groups.values()), skipped: skipped };
  }
  function runsCss() {
    return `
*{box-sizing:border-box}html{color-scheme:light}body{margin:0;background:#f5f5f7;color:#202124;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}button,input,select{font:inherit}button,summary,select{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #c8102e;outline-offset:2px}[hidden]{display:none!important}
.yk-head{display:flex;align-items:center;gap:12px;position:relative;margin:12px;padding:14px 106px 14px 16px;border:1px solid #dcdde1;border-top:4px solid #c8102e;border-radius:14px;background:#fff;min-height:94px}.yk-head img{width:40px;height:46px;object-fit:contain}.yk-head h1{font-size:22px;line-height:1.25;margin:1px 0 3px}.yk-head p{margin:0;color:#61656d;font-size:12px}.yk-word{font-size:10px;letter-spacing:.1em;font-weight:800}
.yk-main{width:100%;max-width:none;padding:0 12px 20px;margin:0}.yk-controls{background:#fff;border:1px solid #dcdde1;border-radius:12px;padding:14px;margin-bottom:12px}.yk-filter-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:end}.yk-filter-grid label{display:grid;gap:4px;font-size:12px;font-weight:700;min-width:0}.yk-search{grid-column:span 2}.yk-filter-grid input,.yk-filter-grid select,.yk-filter-grid button{width:100%;min-width:0;min-height:42px;padding:9px 10px;border:1px solid #cfd1d6;border-radius:8px;background:#fff;color:#202124}.yk-filter-grid input:disabled{background:#f2f2f5;color:#777}.yk-filter-grid button{background:#c8102e;color:#fff;border-color:#c8102e;font-weight:700}.yk-filter-grid button:hover{background:#9f0d25}.yk-count{font-weight:700;margin:10px 0 3px}.yk-note{font-size:12px;color:#61656d;margin:5px 0}.yk-empty{padding:24px;background:#fff;text-align:center;color:#61656d}
.yk-matrix-wrap{max-width:100%;width:100%;overflow:auto;max-height:70vh;border:1px solid #dcdde1;border-radius:12px;background:#fff;-webkit-overflow-scrolling:touch}.yk-matrix{border-collapse:separate;border-spacing:0;table-layout:fixed;width:max-content;min-width:100%;font-size:12px}.yk-matrix th,.yk-matrix td{width:170px;min-width:170px;border-right:1px solid #dcdde1;border-bottom:1px solid #dcdde1;vertical-align:top;padding:10px;background:#fff;color:#202124}.yk-matrix thead th{position:sticky;top:0;z-index:2;padding:12px;background:#f0f0f3;color:#202124;font-weight:800;text-align:center}.yk-matrix .yk-product{position:sticky;left:0;width:230px;min-width:230px;max-width:230px;background:#fff;text-align:left;z-index:1;box-shadow:1px 0 #dcdde1}.yk-matrix thead .yk-product{z-index:3;background:#f0f0f3;color:#202124}.yk-product b{display:block;font-size:14px;overflow-wrap:anywhere}.yk-product small{display:block;font-weight:400;font-size:12px;color:#61656d;overflow-wrap:anywhere}.yk-bu{font-size:10px;font-weight:800;letter-spacing:.05em;color:#a00e27}.yk-matrix tbody tr:nth-child(even)>th,.yk-matrix tbody tr:nth-child(even)>td{background:#fafafb}.yk-matrix td:last-child{border-right:0}.yk-matrix .yk-no-run{text-align:center;vertical-align:middle;color:#92959c}.yk-cell summary{padding:4px;min-height:66px;color:#202124;border-radius:6px}.yk-cell summary::marker{color:#c8102e}.yk-cell summary strong{display:block;font-size:13px;margin:3px 0}.yk-caption{display:block;color:#61656d;font-size:11px;font-weight:400}.yk-cell-line{display:none}.yk-cell[open]{min-width:0}.yk-run-list{border-top:1px solid #dcdde1;margin-top:10px;padding-top:4px}.yk-run{padding:8px 2px;border-bottom:1px solid #eee;overflow-wrap:anywhere}.yk-run b,.yk-run span,.yk-run small{display:block}.yk-run span,.yk-run small{font-size:11px;color:#61656d}.yk-pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0}.yk-pager button{min-height:42px;border:1px solid #cfd1d6;border-radius:8px;background:#fff;color:#202124;padding:8px 16px}.yk-pager button:disabled{opacity:.4;cursor:default}.yk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
#ykEvidenceRadar{position:absolute;right:18px;top:50%;transform:translateY(-50%);width:64px;height:64px;pointer-events:none}.yk-radar-disc{position:absolute;inset:2px;border-radius:50%;border:1px solid #edbcc5;background:repeating-radial-gradient(circle,transparent 0 9px,#f5d8de 10px 11px)}.yk-radar-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(transparent 0deg 275deg,rgba(200,16,46,.04) 285deg,rgba(200,16,46,.3) 359deg,transparent 360deg);animation:ykEvidenceSweep 8s linear infinite}.yk-radar-disc:after{content:"";position:absolute;width:6px;height:6px;border-radius:50%;background:#c8102e;left:calc(50% - 3px);top:calc(50% - 3px);box-shadow:17px -15px 0 -1px #d27a8a,-13px 18px 0 -1px #d27a8a}.yk-radar-label{position:absolute;top:-10px;width:100%;font-size:6px;letter-spacing:.1em;text-align:center;color:#61656d}@keyframes ykEvidenceSweep{to{transform:rotate(360deg)}}
@media(max-width:1100px){.yk-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.yk-head{margin:8px;padding:12px 74px 12px 12px;gap:8px}.yk-head h1{font-size:20px}.yk-head img{width:30px;height:36px}#ykEvidenceRadar{right:12px;width:46px;height:46px}.yk-main{padding:0 8px 16px}.yk-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.yk-filter-grid input,.yk-filter-grid select{font-size:16px}.yk-controls{padding:12px}.yk-matrix-wrap{max-height:none;overflow:visible;border:0;background:transparent}.yk-matrix,.yk-matrix tbody{display:block;width:100%;min-width:0}.yk-matrix thead{display:none}.yk-matrix tr{display:block;border:1px solid #dcdde1;border-radius:12px;background:#fff;overflow:hidden;margin-bottom:12px}.yk-matrix .yk-product{display:block;position:static;width:auto;min-width:0;max-width:none;padding:14px;border-top:3px solid #c8102e;box-shadow:none}.yk-matrix td{display:block;width:auto;min-width:0;padding:12px;border-right:0}.yk-matrix .yk-no-run{display:none}.yk-cell-line{display:block;color:#a00e27;font-weight:800;font-size:14px;margin-bottom:4px}.yk-cell summary{min-height:78px}.yk-cell summary strong{font-size:15px}.yk-caption,.yk-run span{font-size:12px}.yk-pager{font-size:12px}.yk-pager button{padding:8px 12px}}
@media(prefers-reduced-motion:reduce){.yk-radar-sweep{animation:none}}@media print{.yk-controls,.yk-pager,#ykEvidenceRadar{display:none!important}.yk-matrix-wrap{max-height:none;overflow:visible}.yk-matrix{width:100%;min-width:0;table-layout:auto}.yk-matrix th,.yk-matrix td{min-width:0;width:auto;font-size:9px}.yk-head{padding-right:16px}.yk-matrix .yk-product{position:static;min-width:0;width:auto}.yk-main{padding:0}}
`;
  }
  function runRuntime(S) {
    var C = runCore(), root = document.querySelector('[data-yk-runs-root]');
    if (!root) return;
    var filters = { q: '', bu: '', line: '', model: '', sku: '', rev: '', wo: '', period: 'all', from: '', to: '' }, page = 0, pageSize = 30;
    var fields = ['bu', 'line', 'model', 'sku', 'rev', 'wo'], labels = { bu: 'Todas las BU', line: 'Todas las líneas', model: 'Todos los modelos', sku: 'Todos los SKU / PN', rev: 'Todas las revisiones', wo: 'Todas las WO' };
    function el(key) { return root.querySelector('[data-filter="' + key + '"]'); }
    var latest = S.runs.reduce(function (v, r) { return C.day(r.start) > v ? C.day(r.start) : v; }, '');
    function today() { var p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Ciudad_Juarez', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return p.year + '-' + p.month + '-' + p.day; }
    function offset(day, n) { var d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    function presets() {
      var mode = filters.period, now = today();
      if (mode === 'latest') filters.from = filters.to = latest;
      else if (mode === 'today') filters.from = filters.to = now;
      else if (mode === '7' || mode === '30') { filters.from = offset(now, 1 - Number(mode)); filters.to = now; }
      else if (mode === 'all' || mode === 'undated') filters.from = filters.to = '';
      el('from').value = filters.from; el('to').value = filters.to;
      el('from').disabled = el('to').disabled = mode !== 'custom';
    }
    function render() {
      fields.forEach(function (field) {
        var values = C.unique(C.filter(S.runs, filters, field).map(function (r) { return r[field]; }));
        if (filters[field] && values.indexOf(filters[field]) < 0) values.unshift(filters[field]);
        var select = el(field);
        select.innerHTML = '<option value="">' + labels[field] + '</option>' + values.map(function (value) { return '<option value="' + C.esc(value) + '">' + C.esc(value) + '</option>'; }).join('');
        select.value = filters[field];
      });
      var selected = C.filter(S.runs, filters), rows = C.group(selected), lines = C.unique(selected.map(function (r) { return r.line; }));
      var pages = Math.max(1, Math.ceil(rows.length / pageSize)); page = Math.min(page, pages - 1);
      root.querySelector('[data-yk-matrix]').innerHTML = C.matrix(rows.slice(page * pageSize, (page + 1) * pageSize), lines);
      var invalid = !['all', 'undated'].includes(filters.period) && (!C.day(filters.from) || !C.day(filters.to) || filters.from > filters.to);
      root.querySelector('[data-yk-count]').textContent = invalid ? 'Selecciona un rango válido de inicio de corrida.' : selected.length + ' de ' + S.runs.length + ' corridas · ' + rows.length + ' modelos/SKU/revisiones · ' + lines.length + ' líneas';
      root.querySelector('[data-yk-page]').textContent = 'Página ' + (page + 1) + ' de ' + pages;
      root.querySelector('[data-yk-prev]').disabled = page === 0;
      root.querySelector('[data-yk-next]').disabled = page + 1 >= pages;
      root.querySelector('[data-yk-pager]').hidden = rows.length <= pageSize;
    }
    root.querySelector('[data-yk-cutoff]').textContent = 'Último inicio registrado: ' + (latest || 'sin fecha') + ' · ' + S.runs.filter(function (r) { return !C.day(r.start); }).length + ' corridas sin fecha válida. Fechas de inicio de la fuente; no confirman producción en vivo.';
    fields.concat(['period', 'from', 'to']).forEach(function (field) { el(field).addEventListener('change', function () { filters[field] = this.value; if (field === 'period') presets(); page = 0; render(); }); });
    el('q').addEventListener('input', function () { filters.q = this.value; page = 0; render(); });
    root.querySelector('[data-yk-reset]').onclick = function () { Object.keys(filters).forEach(function (k) { filters[k] = k === 'period' ? 'all' : ''; }); el('q').value = ''; el('period').value = 'all'; page = 0; presets(); render(); };
    root.querySelector('[data-yk-prev]').onclick = function () { page--; render(); };
    root.querySelector('[data-yk-next]').onclick = function () { page++; render(); };
    presets(); render();
    root.querySelector('[data-yk-controls]').hidden = false;
  }
  function logoFor(w) {
    // The existing 8D shield is embedded once for offline exports; no external
    // logo request is needed when the file is opened in iPhone Files.
    return LOGO;
  }
  function reportHtml(S, w) {
    var esc = core.esc, rows = core.group(S.runs), lines = core.unique(S.runs.map(function (r) { return r.line; }));
    var controls = '<section class="yk-controls" data-yk-controls hidden aria-label="Filtros de corridas"><div class="yk-filter-grid"><label class="yk-search">Buscar<input type="search" data-filter="q" placeholder="Modelo, SKU, revisión o WO"></label>' + [['bu', 'BU'], ['line', 'Línea'], ['model', 'Modelo'], ['sku', 'SKU / PN'], ['rev', 'Revisión'], ['wo', 'WO']].map(function (p) { return '<label>' + p[1] + '<select data-filter="' + p[0] + '"></select></label>'; }).join('') + '<label>Inicio de corrida<select data-filter="period"><option value="all">Todo el historial</option><option value="latest">Último día con datos</option><option value="today">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="custom">Rango de fechas</option><option value="undated">Sin fecha de inicio</option></select></label><label>Desde<input type="date" data-filter="from" disabled></label><label>Hasta<input type="date" data-filter="to" disabled></label><button type="button" data-yk-reset>Restablecer</button></div><p class="yk-count" data-yk-count role="status" aria-live="polite"></p><p class="yk-note" data-yk-cutoff></p></section>';
    var payload = JSON.stringify(S).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMTinel · Matriz de corridas Yokoten</title><link rel="icon" href="' + logoFor(w) + '"><style>' + runsCss() + '</style></head><body data-yk-runs-root><header class="yk-head"><img alt="Logo SMTinel" src="' + logoFor(w) + '"><div><span class="yk-word">SMTinel · YOKOTEN</span><h1>Matriz de corridas</h1><p>BU · Modelo · SKU · Revisión × Línea. Abre una celda para consultar WO e inicio.</p></div><div id="ykEvidenceRadar" aria-hidden="true"><span class="yk-radar-label">YOKOTEN RADAR</span><div class="yk-radar-disc"><span class="yk-radar-sweep"></span></div></div></header><main class="yk-main">' + controls + '<noscript><p class="yk-note">Vista de lectura: todas las corridas. Los filtros se habilitan al abrir el HTML en un navegador con JavaScript.</p></noscript><div class="yk-matrix-wrap" data-yk-matrix tabindex="0" role="region" aria-label="Matriz por línea">' + (rows.length ? core.matrix(rows, lines) : '<div class="yk-empty">No hay corridas en Common DB. Carga Station_on_line_report y DB_Model y vuelve a generar el reporte.</div>') + '</div><nav class="yk-pager" data-yk-pager hidden aria-label="Páginas de matriz"><button type="button" data-yk-prev>Anterior</button><span data-yk-page></span><button type="button" data-yk-next>Siguiente</button></nav><p class="yk-note">Fuente: ' + esc(S.source) + ' · Generado: ' + esc(core.dateLabel(S.generated.slice(0, 10))) + '. Cada corrida agrupa una WO por línea, modelo/SKU y revisión; se conserva el inicio más antiguo válido. Sin BU o fecha no disponible se muestran explícitamente.</p></main><script id="yk-runs-data">window.__YK_RUNS__=' + payload + ';</scr' + 'ipt><script id="yk-runs-runtime">' + runCore.toString() + '\n(' + runRuntime.toString() + ')(window.__YK_RUNS__);</scr' + 'ipt></body></html>';
  }
  function downloadRuns(w) {
    w.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__ = 1;
    try {
      var html = reportHtml(buildRunSnapshot(w), w), blob = new w.Blob([html], { type: 'text/html;charset=utf-8' });
      var a = w.document.createElement('a'), url = w.URL.createObjectURL(blob);
      a.href = url; a.download = 'SMTinel_Yokoten_Corridas_' + new Date().toISOString().slice(0, 10) + '.html';
      a.style.display = 'none'; w.document.body.appendChild(a); a.click();
      w.__SMTINEL_LAST_YOKOTEN_EXPORT__ = { at: new Date().toISOString(), bytes: blob.size, name: a.download, method: 'download-requested', build: 'runs-v3' };
      w.setTimeout(function () { a.remove(); w.URL.revokeObjectURL(url); }, 120000);
      return true;
    } finally { w.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__ = 0; }
  }
  function mountPreview(w, owner) {
    var root = w.document.querySelector('[data-yk-run-preview]');
    if (!root || root.__ykMounted) return;
    root.__ykMounted = true;
    root.innerHTML = '<button type="button" data-yk-refresh class="btn">Actualizar matriz</button><p style="font:12px/1.5 system-ui;color:#61656d">Los filtros de la vista previa no recortan el archivo. El HTML exportado incluye los mismos filtros.</p><iframe data-yk-run-frame title="Vista previa de matriz de corridas Yokoten" style="display:block;width:100%;height:850px;border:1px solid #dcdde1;border-radius:12px;background:#f5f5f7"></iframe><p data-yk-preview-error role="alert" hidden></p>';
    var frame = root.querySelector('iframe'), error = root.querySelector('[data-yk-preview-error]');
    // This dedicated frame isolates the report from the accumulated app skins.
    function refresh() {
      try { frame.srcdoc = reportHtml(buildRunSnapshot(owner), owner); error.hidden = true; }
      catch (err) { error.textContent = 'No se pudo cargar la matriz: ' + err.message; error.hidden = false; }
    }
    root.querySelector('[data-yk-refresh]').onclick = refresh;
    refresh();
  }
  function install(w) {
    var d;
    try { d = w.document; if (!d || !d.head || d.querySelector('[data-yk-runs-root]')) return; } catch (_) { return; }
    if (typeof w.SMTinelBuildYokotenExportHtml === 'function' && !w.SMTinelBuildYokotenExportHtml.__yokotenRunsV3) {
      var build = function () { return reportHtml(buildRunSnapshot(w), w); };
      build.__yokotenRunsV3 = true;
      w.SMTinelBuildYokotenExportHtml = build;
      w.SMTinelBuildYokotenPreviewHtml = function () { return '<div data-yk-run-preview></div>'; };
      w.SMTinelDownloadYokotenHtml = function () { return downloadRuns(w); };
    }
    var owner = builderWindow(w);
    if (owner) {
      var style = d.getElementById(VERSION);
      if (!style) { style = d.createElement('style'); style.id = VERSION; d.head.appendChild(style); }
      var css = sectionCss(); if (style.textContent !== css) style.textContent = css;
      var type = d.getElementById('reportType'), modal = d.getElementById('emailModal'), yokoten = !!(type && type.value === 'YOKOTEN');
      if (modal) {
        if (yokoten && modal.getAttribute('data-yk-report') !== '1') modal.setAttribute('data-yk-report', '1');
        else if (!yokoten && modal.hasAttribute('data-yk-report')) modal.removeAttribute('data-yk-report');
      }
      var preview = d.getElementById('emailPreview');
      if (yokoten && preview) {
        if (!preview.querySelector('[data-yk-run-preview]')) preview.innerHTML = '<div data-yk-run-preview></div>';
        mountPreview(w, owner);
        var note = d.querySelector('.report-preview-head span'), noteText = 'Matriz de corridas · Common DB · Shainin Red X';
        if (note && note.textContent !== noteText) note.textContent = noteText;
        var title = d.getElementById('reportModalTitle'), hint = d.getElementById('reportScopeHint');
        if (title && title.textContent !== 'Yokoten · Matriz de corridas') title.textContent = 'Yokoten · Matriz de corridas';
        var hintText = 'BU, modelo, SKU, revisión, línea e inicio de corrida desde Common DB. Filtra la matriz y abre una celda para consultar las WO.';
        if (hint && hint.textContent !== hintText) hint.textContent = hintText;
      }
    }
    if (!seen.has(d)) {
      seen.add(d);
      var timer;
      new w.MutationObserver(function () { clearTimeout(timer); timer = setTimeout(function () { install(w); }, 120); }).observe(d.documentElement, { childList: true, subtree: true });
      d.addEventListener('click', function (ev) { receiveDownload(w, ev); }, true);
      d.addEventListener('change', function (ev) { if (ev.target.id === 'reportType') setTimeout(function () { install(w); }, 0); }, true);
      w.addEventListener('click', function (ev) {
        var button = ev.target && ev.target.closest && ev.target.closest('#downloadEmail'), type = d.getElementById('reportType'), owner = builderWindow(w);
        if (!button || !type || type.value !== 'YOKOTEN' || !owner) return;
        ev.preventDefault(); ev.stopImmediatePropagation();
        if (isMobile(w)) mobileExport(w, owner);
        else {
          try { owner.SMTinelDownloadYokotenHtml(); }
          catch (err) { var panel = deliveryPanel(d); panel.innerHTML = '<p role="alert">No se pudo generar la matriz: ' + escapeHtml(err.message) + '</p>'; }
        }
      }, true);
      d.addEventListener('load', function (ev) { if (ev.target.tagName === 'IFRAME' && !ev.target.hasAttribute('data-yk-run-frame')) install(ev.target.contentWindow); }, true);
    }
    d.querySelectorAll('iframe:not([data-yk-run-frame])').forEach(function (frame) { install(frame.contentWindow); });
  }

  function sectionCss() {
    return `
html body #exportcenter-section>section:first-child{background:#fff!important;color:#202124!important;border-top:4px solid #c8102e;border-radius:14px!important;padding:14px 16px!important}
html body #exportcenter-section>section:first-child *{color:#202124!important}
html body #emailModal[data-yk-report="1"]{${palette(false)}color-scheme:light;color:var(--yk-text)!important}
html body #emailModal[data-yk-report="1"] .dialog,html body #emailModal[data-yk-report="1"] .export-dialog,
html body #emailModal[data-yk-report="1"] .dialog-body.export-dialog-body,
html body #emailModal[data-yk-report="1"] .report-builder-sidebar,html body #emailModal[data-yk-report="1"] .report-preview-pane,
html body #emailModal[data-yk-report="1"] .report-config,html body #emailModal[data-yk-report="1"] .email-preview,
html body #emailModal[data-yk-report="1"] .export-action-panel{background:var(--yk-paper)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important;min-width:0!important}
html body #emailModal[data-yk-report="1"] .head,html body #emailModal[data-yk-report="1"] .export-head,html body #emailModal[data-yk-report="1"] .dialog-head{background:#fff!important;color:#202124!important;border-top:3px solid #c8102e!important;padding:12px 16px!important}
html body #emailModal[data-yk-report="1"] h2,html body #emailModal[data-yk-report="1"] #reportModalTitle{color:#202124!important}
html body #emailModal[data-yk-report="1"] .field,html body #emailModal[data-yk-report="1"] .report-input-label,
html body #emailModal[data-yk-report="1"] #reportModalSub,html body #emailModal[data-yk-report="1"] .export-action-title{color:#61656d!important}
html body #emailModal[data-yk-report="1"] .scope-hint{background:#f5f5f7!important;color:#61656d!important;border-left-color:#c8102e!important;font-size:12px!important;line-height:1.5!important}
html body #emailModal[data-yk-report="1"] input,html body #emailModal[data-yk-report="1"] select,html body #emailModal[data-yk-report="1"] .btn{background:#fff!important;color:#202124!important;border-color:#dcdde1!important;min-height:44px;box-sizing:border-box;max-width:100%}
html body #emailModal[data-yk-report="1"] #downloadEmail{background:#c8102e!important;color:#fff!important;border-color:#c8102e!important;font-size:16px!important;white-space:normal!important}
html body #emailModal[data-yk-report="1"] #downloadEmail:disabled{opacity:.6;cursor:wait}
html body #emailModal[data-yk-report="1"] .report-preview-head{background:#f2f2f5!important;color:#202124!important;border-color:#dcdde1!important}
html body #emailModal[data-yk-report="1"] .report-preview-head span{color:#61656d!important;letter-spacing:.03em!important}
html body #emailModal[data-yk-report="1"] #emailPreview{padding:12px!important;overflow-x:hidden!important}
html body .yk-delivery{font:14px/1.5 system-ui,sans-serif;background:#fff!important;color:#202124!important;border:1px solid #dcdde1;border-top:3px solid #c8102e;border-radius:12px;padding:14px;margin-top:12px;overflow-wrap:anywhere}
html body .yk-delivery p{color:#61656d!important;margin:6px 0 12px}.yk-delivery .yk-delivery-actions{display:flex;flex-wrap:wrap;gap:8px}
html body .yk-delivery a,html body .yk-delivery button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:1px solid #c8102e;border-radius:9px;font:700 14px/1.4 system-ui;color:#a70f29!important;background:#fff!important;text-decoration:none;box-sizing:border-box}
html body .yk-delivery button[data-yk-share]{background:#c8102e!important;color:#fff!important}
.yk-delivery [hidden]{display:none!important}
html body #smtinelYokotenExportToastV195{background:#24262b!important;border-color:#c8102e!important;color:#fff!important}
@media(max-width:900px){html body #emailModal[data-yk-report="1"] input,html body #emailModal[data-yk-report="1"] select{font-size:16px!important}
html body #emailModal[data-yk-report="1"] .report-builder{display:block!important;overflow:visible!important}
html body #emailModal[data-yk-report="1"] .report-builder-sidebar,html body #emailModal[data-yk-report="1"] .report-preview-pane{height:auto!important;max-height:none!important;overflow:visible!important}
html body #emailModal[data-yk-report="1"] .report-preview-pane{display:block!important}
html body #emailModal[data-yk-report="1"] .report-preview-head{position:static!important;display:block!important}
html body #emailModal[data-yk-report="1"] .report-preview-head span{display:block;margin-top:4px;font-size:10px!important}
}
`;
  }
  function isMobile(w) {
    return !!(w.matchMedia && w.matchMedia('(max-width:900px)').matches) || /iPhone|iPad|iPod/.test(w.navigator.userAgent || '') || (w.navigator.platform === 'MacIntel' && w.navigator.maxTouchPoints > 1);
  }
  function builderWindow(w) {
    var candidates = [w.top, w.parent, w];
    for (var i = 0; i < candidates.length; i++) {
      try { if (typeof candidates[i].SMTinelBuildYokotenExportHtml === 'function') return candidates[i]; } catch (_) {}
    }
    return null;
  }
  var delivery = { doc: null, panel: null, url: '', generation: 0, busy: false };
  function deliveryPanel(d) {
    var panel = d.getElementById('ykMobileDelivery');
    if (!panel) {
      panel = d.createElement('section'); panel.id = 'ykMobileDelivery'; panel.className = 'yk-delivery';
      panel.setAttribute('aria-label', 'Guardar reporte Yokoten');
      (d.querySelector('.export-action-panel') || d.body).appendChild(panel);
    }
    delivery.doc = d; delivery.panel = panel;
    return panel;
  }
  function mobileExport(w, owner) {
    if (delivery.busy || owner.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__) return;
    delivery.busy = true; delivery.generation++;
    var generation = delivery.generation, panel = deliveryPanel(w.document), button = w.document.getElementById('downloadEmail');
    if (delivery.url) { window.URL.revokeObjectURL(delivery.url); delivery.url = ''; }
    panel.innerHTML = '<b>Preparando Yokoten</b><p role="status">Se está preparando la matriz de corridas. Al terminar podrás abrirlo, descargarlo o guardarlo en Archivos.</p>';
    if (button) { button.disabled = true; button.textContent = 'Preparando Yokoten…'; }
    function finish() {
      if (generation !== delivery.generation) return;
      if (owner.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__) { w.setTimeout(finish, 500); return; }
      delivery.busy = false;
      if (button && button.isConnected) { button.disabled = false; button.textContent = 'Preparar nueva exportación'; }
      // Fetching the completed Blob can still be in progress; that path owns its
      // own error message. Do not claim a file was saved merely because build ended.
      if (!panel.querySelector('[data-yk-receiving]') && !delivery.url) panel.innerHTML = '<b>No se completó la preparación</b><p role="alert">Revisa el mensaje del exportador y vuelve a intentarlo. No se ha guardado ningún archivo.</p>';
    }
    try { owner.SMTinelDownloadYokotenHtml(); } catch (err) {
      panel.innerHTML = '<p role="alert">' + escapeHtml(err.message) + '</p>';
    }
    w.setTimeout(finish, 500);
  }
  function receiveDownload(w, ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[download]');
    if (!a || a.hasAttribute('data-yk-save') || (!delivery.busy && !isMobile(w)) || !/yokoten.*\.html$/i.test(a.download || '') || !/^blob:/.test(a.href)) return;
    // Intercept only the final mobile HTML delivery, never CSVs or other reports.
    ev.preventDefault();
    var generation = delivery.generation, panel = deliveryPanel(delivery.doc && delivery.doc.defaultView ? delivery.doc : w.document);
    panel.innerHTML = '<b data-yk-receiving>Reporte preparado</b><p role="status">Creando las opciones para guardarlo…</p>';
    var name = a.download;
    w.fetch(a.href).then(function (r) { if (!r.ok) throw new Error('No se pudo leer el archivo preparado.'); return r.blob(); }).then(function (blob) {
      if (generation !== delivery.generation) return;
      if (delivery.url) window.URL.revokeObjectURL(delivery.url);
      // Own this URL independently of the exporter’s temporary download URL.
      delivery.url = window.URL.createObjectURL(blob);
      var ui = panel.ownerDocument.defaultView, file = typeof ui.File === 'function' ? new ui.File([blob], name, { type: 'text/html' }) : null;
      var shareData = file && { files: [file], title: 'SMTinel · Yokoten' };
      var canShare = false;
      try { canShare = !!(shareData && ui.navigator.share && ui.navigator.canShare && ui.navigator.canShare(shareData)); } catch (_) {}
      panel.innerHTML = '<b>Yokoten listo · ' + number(Math.round(blob.size / 1024)) + ' KB</b><p data-yk-save-status role="status" aria-live="polite">Elige cómo abrir o guardar el archivo. Prepararlo no lo guarda automáticamente.</p><div class="yk-delivery-actions"><a data-yk-open target="_blank" rel="noopener">Abrir reporte completo</a><a data-yk-save>Descargar HTML</a>' + (canShare ? '<button type="button" data-yk-share>Compartir / Guardar en Archivos</button>' : '') + '</div>';
      panel.querySelector('[data-yk-open]').href = delivery.url;
      var save = panel.querySelector('[data-yk-save]'); save.href = delivery.url; save.download = name;
      save.addEventListener('click', function () { panel.querySelector('[data-yk-save-status]').textContent = 'Descarga solicitada. Revisa Descargas; si Safari abre el archivo, usa Compartir para guardarlo.'; });
      var share = panel.querySelector('[data-yk-share]');
      if (share) share.onclick = function () {
        // No await before share: this must execute inside a fresh user gesture.
        try {
          ui.navigator.share(shareData).then(function () { panel.querySelector('[data-yk-save-status]').textContent = 'Se completó la acción de compartir. Si elegiste Guardar, revisa Archivos.'; }).catch(function (err) {
            panel.querySelector('[data-yk-save-status]').textContent = err.name === 'AbortError' ? 'Acción cancelada. El reporte sigue disponible aquí.' : 'No se pudo compartir. Usa Descargar HTML o Abrir reporte completo.';
          });
        } catch (_) { panel.querySelector('[data-yk-save-status]').textContent = 'No se pudo compartir. Usa Descargar HTML o Abrir reporte completo.'; }
      };
      w.__SMTINEL_LAST_YOKOTEN_EXPORT__ = { at: new Date().toISOString(), bytes: blob.size, name: name, method: 'ready-for-user', build: 'runs-v3' };
    }).catch(function (err) {
      if (generation === delivery.generation) panel.innerHTML = '<b>No se pudo preparar el guardado</b><p role="alert">' + escapeHtml(err.message) + ' Vuelve a preparar la exportación.</p>';
    });
  }
  new MutationObserver(function () { install(window); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  install(window);
  window.addEventListener('load', function () { install(window); });
  window.addEventListener('pagehide', function (ev) {
    if (!ev.persisted && delivery.url) { window.URL.revokeObjectURL(delivery.url); delivery.url = ''; }
  });
}());
