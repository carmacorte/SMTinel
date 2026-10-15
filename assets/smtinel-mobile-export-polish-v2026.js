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


/* Yokoten preview/export appearance: identical palette, isolated from app skins. */
(function () {
  'use strict';
  var VERSION = 'smtinel-yokoten-appearance-v1';
  var seen = new WeakSet();
  function mode() {
    // Reports use the same light Shainin canvas as 8D, independent of app chrome.
    return 'light';
  }
  function palette(dark) {
    return dark
      ? '--yk-page:#17181b;--yk-paper:#24262b;--yk-soft:#303239;--yk-text:#ffffff;--yk-muted:#d3d5db;--yk-border:#62656e;--yk-accent:#ff8195;'
      : '--yk-page:#f5f5f7;--yk-paper:#ffffff;--yk-soft:#f2f2f5;--yk-text:#202124;--yk-muted:#61656d;--yk-border:#dcdde1;--yk-accent:#c8102e;';
  }
  function exportCss(theme) {
    return 'html:root{' + palette(theme === 'dark') + 'color-scheme:' + theme + ';}' + `
html body{background:var(--yk-page)!important;color:var(--yk-text)!important;font-family:Segoe UI,Arial,sans-serif!important}
html body header{background:var(--yk-paper)!important;color:var(--yk-text)!important;border:1px solid var(--yk-border)!important;border-top:4px solid var(--yk-accent)!important;border-radius:14px!important;margin:12px 12px 0!important;padding:14px 16px!important;box-shadow:none!important}
html body header .brand-copy h1,html body header .brand-word,html body header .brand-word .accent{color:var(--yk-text)!important}
html body header p,html body header .brand-tag{color:var(--yk-muted)!important}
html body .kpi,html body .panel,html body .card,html body .cb,html body #mx .matrix .cell,html body #mx .matrix .rowhead,html body .subkpis div{background:var(--yk-paper)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}
html body .panel,html body .card{border-radius:14px!important;overflow:hidden}
html body .kpi b,html body .grid4 strong,html body .rowhead b{color:var(--yk-text)!important}
html body #mx .matrix .cell .exposure-copy,html body .kpi span,html body .grid4 span,html body .rowhead small,html body .foot,html body .empty{color:var(--yk-muted)!important}
html body .matrix th,html body .matrix td,html body .mini th,html body .mini td,html body .tracker th,html body .tracker td{border-color:var(--yk-border)!important}
html body .matrix thead th,html body .ct,html body .mini th,html body .tracker th,html body .subkpis{background:var(--yk-soft)!important;color:var(--yk-text)!important}
html body #mx .matrix tbody tr:nth-child(even) .cell,html body #mx .matrix tbody tr:nth-child(even) .rowhead{background:var(--yk-soft)!important}
html body #mx .matrix .cell:hover,html body #mx .matrix .cell.sel{background:var(--yk-soft)!important;box-shadow:inset 0 0 0 2px var(--yk-accent)!important}
html body .hero{background:var(--yk-soft)!important;color:var(--yk-text)!important;border-bottom:1px solid var(--yk-border)!important}
html body .hero h2,html body .hero p{color:var(--yk-text)!important}
html body #meta{color:var(--yk-muted)!important}
html body .tools input,html body .tools select,html body .btn,html body .tracker input,html body .tracker select,html body .tracker textarea{background:var(--yk-paper)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}
html body .btn:hover{background:var(--yk-soft)!important}
html body header{min-height:108px;padding-right:126px!important}
#ykEvidenceRadar{position:absolute;right:20px;top:50%;transform:translateY(-50%);width:80px;height:80px;pointer-events:none;color:#c8102e}
#ykEvidenceRadar .yk-radar-disc{position:absolute;inset:6px;border:1px solid rgba(200,16,46,.18);border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 10px,rgba(200,16,46,.13) 11px 12px)}
#ykEvidenceRadar .yk-radar-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg 275deg,rgba(200,16,46,.04) 285deg,rgba(200,16,46,.28) 359deg,transparent 360deg);animation:ykEvidenceSweep 8s linear infinite;transform-origin:center}
#ykEvidenceRadar .yk-radar-disc:after{content:"";position:absolute;left:calc(50% - 3px);top:calc(50% - 3px);width:6px;height:6px;border-radius:50%;background:#c8102e;box-shadow:16px -22px 0 -1px rgba(200,16,46,.48),-20px -12px 0 -1px rgba(200,16,46,.4),23px 9px 0 -1px rgba(200,16,46,.4),-12px 23px 0 -1px rgba(200,16,46,.48)}
#ykEvidenceRadar .yk-radar-label{position:absolute;top:-6px;left:50%;transform:translateX(-50%);white-space:nowrap;font:700 7px/1 system-ui,sans-serif;letter-spacing:.16em;color:var(--yk-muted)}
@keyframes ykEvidenceSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(max-width:600px){html body header{padding-right:80px!important}#ykEvidenceRadar{right:10px;width:56px;height:56px}#ykEvidenceRadar .yk-radar-label{font-size:5px}#ykEvidenceRadar .yk-radar-disc{inset:3px;background:repeating-radial-gradient(circle,transparent 0 7px,rgba(200,16,46,.13) 8px 9px)}#ykEvidenceRadar .yk-radar-disc:after{box-shadow:10px -16px 0 -1px rgba(200,16,46,.48),-14px -8px 0 -1px rgba(200,16,46,.4),15px 7px 0 -1px rgba(200,16,46,.4)}}
@media(prefers-reduced-motion:reduce){#ykEvidenceRadar .yk-radar-sweep{animation:none}}
@media print{#ykEvidenceRadar{display:none}html body header{padding-right:16px!important}}
@media print{html:root{${palette(false)}color-scheme:light}html body header{position:static!important}}
` + readingCss() + `
html:root body{margin:0;overflow-wrap:anywhere}
html:root body header{position:relative!important}
html:root body header .brand-icon{background:transparent!important;border:0!important;box-shadow:none!important}
html:root body header .brand-icon img{object-fit:contain;max-width:100%}
html:root body .wrap{max-width:1600px;min-width:0}
html:root body .tools input,html:root body .tools select{min-height:44px}
html:root body .btn:focus-visible,html:root body .cell:focus-visible{outline:3px solid var(--yk-accent);outline-offset:2px}
html:root body .ct,html:root body .yk20-critical-head{background:var(--yk-soft)!important;color:var(--yk-text)!important}
html:root body .yk20-critical-head b{color:var(--yk-accent)!important}
html:root body .yk20-critical-card,html:root body .yk203-actions-note{border-color:var(--yk-border)!important}
html.yk-interactive-ready #ykStaticReport{display:none!important}
html:not(.yk-interactive-ready) body>.wrap{display:none!important}
@media(max-width:700px){
 html:root body header{margin:8px!important;padding:12px 76px 12px 12px!important;min-height:88px}
 html:root body header .brand{min-width:0;gap:8px}html:root body header .brand-copy{min-width:0}
 html:root body header .brand-icon{width:36px;height:40px;flex-shrink:0}
 html:root body header h1{font-size:20px!important}html:root body header p{font-size:12px!important;line-height:1.5}
 html:root body header .brand-topline{flex-wrap:wrap}html:root body header .brand-tag{font-size:8px!important}
 html:root body .wrap{padding:8px!important}html:root body .kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html:root body .tools{display:flex!important;flex-wrap:wrap!important}html:root body .tools>*{width:100%!important;min-width:0!important;box-sizing:border-box}
 html:root body input,html:root body select,html:root body textarea{font-size:16px!important;max-width:100%}
 html:root body #mx{overflow:visible!important;max-height:none!important}
 html:root body #mx .matrix,html:root body #mx .matrix tbody{display:block!important;width:100%!important;min-width:0!important}
 html:root body #mx .matrix thead{display:none!important}
 html:root body #mx .matrix tr{display:block!important;border-bottom:8px solid var(--yk-page)}
 html:root body #mx .matrix td,html:root body #mx .matrix .rowhead{display:block!important;position:static!important;width:auto!important;min-width:0!important;max-width:none!important}
 html:root body #mx .matrix td[data-yk-empty="1"]{display:none!important}
 html:root body #mx .matrix td[data-yk-line]:before{content:attr(data-yk-line);display:block;padding:10px 12px 0;font:700 13px/1.5 system-ui;color:var(--yk-accent)}
 html:root body #mx .matrix .rowhead{padding:14px!important;border-top:3px solid var(--yk-accent)!important}
 html:root body #mx .matrix .rowhead b{font-size:16px!important}html:root body #mx .matrix .rowhead small{font-size:12px!important}
 html:root body #mx .matrix .cell{min-width:0!important;width:100%!important;padding:12px!important;min-height:104px!important}
 html:root body #mx .grid4 span{font-size:12px!important}html:root body #mx .grid4 strong{font-size:14px!important}
 html:root body .subkpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 html:root body .cb,html:root body .yk20-critical-body{overflow-x:auto;-webkit-overflow-scrolling:touch}
 html:root body .mini,html:root body .tracker{font-size:12px!important}
 html:root body #detail .hero h2{font-size:20px!important}html:root body #detail .hero p{font-size:12px!important}
 html:root body #mx tr[hidden]{display:none!important}
}
`;
  }
  // Serialized into the standalone report; does not alter its embedded snapshot.
  function yokotenTimeFilter() {
    'use strict';
    var S = window.__YK__, mx = document.getElementById('mx');
    if (!S || !mx || document.getElementById('ykTimeFilter')) return;
    var cells = Object.create(null), latest = '', missing = 0;
    function day(value) {
      var m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(String(value || ''));
      if (!m) return '';
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[1] + '-' + m[2] + '-' + m[3] : '';
    }
    function localToday() {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function offset(date, n) {
      var d = new Date(date + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    }
    (S.rows || []).forEach(function (r) {
      Object.keys(r.cells || {}).forEach(function (line) {
        var c = r.cells[line];
        cells[c.key] = c;
        if (c.exposure) return;
        var date = day(c.last);
        if (!date) missing++;
        if (date > latest) latest = date;
      });
    });
    var box = document.createElement('section');
    box.id = 'ykTimeFilter';
    box.setAttribute('aria-label', 'Filtro de fecha de última corrida');
    box.innerHTML = '<div class="yk-time-fields"><label>Última corrida registrada<select id="ykTimePreset"><option value="all">Todo el historial</option><option value="latest">Último día con datos</option><option value="today">Hoy</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="custom">Rango de fechas</option></select></label><label>Desde<input id="ykTimeFrom" type="date" disabled></label><label>Hasta<input id="ykTimeTo" type="date" disabled></label><button id="ykTimeReset" type="button">Restablecer</button></div><p id="ykTimeCutoff"></p><p id="ykTimeStatus" role="status" aria-live="polite"></p><p class="yk-time-scope">Filtra combinaciones producto × línea por su última fecha de corrida en Common DB. Piezas, WO y detalle conservan el historial completo. No confirma producción en vivo.</p><p id="ykTimeEmpty" hidden>No hay combinaciones que coincidan con la fecha, el producto y la línea seleccionados.</p>';
    var anchor = mx.closest('.panel') || mx;
    anchor.parentNode.insertBefore(box, anchor);
    var css = document.createElement('style');
    css.id = 'ykTimeFilterStyles';
    css.textContent = '#ykTimeFilter{margin:0 0 12px;padding:12px 14px;border:1px solid var(--yk-border,#d7ded8);border-radius:12px;background:var(--yk-paper,#fff);color:var(--yk-text,#202124);font:12px/1.5 system-ui,sans-serif}#ykTimeFilter .yk-time-fields{display:flex;align-items:end;gap:10px;flex-wrap:wrap}#ykTimeFilter label{display:grid;gap:4px;font-size:11px;font-weight:700}#ykTimeFilter input,#ykTimeFilter select,#ykTimeFilter button{font:inherit;padding:9px;border:1px solid var(--yk-border,#bdc9c0);border-radius:8px;background:var(--yk-paper,#fff);color:var(--yk-text,#202124);min-height:38px}#ykTimeFilter input:disabled{opacity:.6}#ykTimeFilter p{margin:6px 0 0}#ykTimeFilter .yk-time-scope,#ykTimeCutoff{color:var(--yk-muted,#61656d);font-size:11px}#ykTimeStatus{font-weight:700}#ykTimeEmpty{padding:12px;background:var(--yk-soft,#f5f5f6);border-radius:8px}html body #mx .yk-time-out{position:relative}html body #mx .yk-time-out>button{display:none!important}html body #mx .yk-time-out:after{content:"Fuera del periodo / sin fecha";display:block;padding:16px;font:11px/1.5 system-ui,sans-serif;color:var(--yk-muted,#61656d)}html body #mx tr[hidden],#ykTimeFilter [hidden]{display:none!important}@media(max-width:600px){#ykTimeFilter .yk-time-fields{display:grid;grid-template-columns:1fr 1fr}#ykTimeFilter label:first-child{grid-column:1/-1}#ykTimeFilter input,#ykTimeFilter select{width:100%;min-width:0}}';
    document.head.appendChild(css);
    var preset = document.getElementById('ykTimePreset'), from = document.getElementById('ykTimeFrom'), to = document.getElementById('ykTimeTo');
    var status = document.getElementById('ykTimeStatus'), empty = document.getElementById('ykTimeEmpty');
    var cutoff = document.getElementById('ykTimeCutoff');
    cutoff.textContent = 'Última fecha registrada en Common DB: ' + (latest || 'sin fecha disponible') + ' · Exportado: ' + (day(S.generated) || 'sin fecha') + (missing ? ' · ' + missing + ' combinaciones sin fecha' : '');
    function clearDetail() {
      var detail = document.getElementById('detail');
      if (detail) { detail.classList.remove('open'); detail.innerHTML = ''; }
    }
    function apply() {
      observer.disconnect();
      var active = preset.value !== 'all', start = day(from.value), end = day(to.value);
      var valid = !active || (!!start && !!end && start <= end), count = 0, rowCount = 0;
      mx.querySelectorAll('tbody tr').forEach(function (row) {
        var hits = 0;
        row.querySelectorAll('button[data-k]').forEach(function (button) {
          var cell = cells[button.getAttribute('data-k')], date = cell && !cell.exposure ? day(cell.last) : '';
          var show = !active || (valid && !!date && date >= start && date <= end);
          var td = button.closest('td');
          if (td) td.classList.toggle('yk-time-out', !show);
          if (show) { hits++; count++; }
        });
        row.hidden = active && !hits;
        if (hits) rowCount++;
      });
      empty.hidden = count > 0 || !valid;
      if (!valid) status.textContent = preset.value === 'latest' && !latest ? 'No hay fechas de corrida disponibles en Common DB.' : 'Selecciona un rango válido: Desde debe ser anterior o igual a Hasta.';
      else status.textContent = (active ? start + ' a ' + end + ' · ' : 'Historial completo · ') + rowCount + ' productos/revisiones · ' + count + ' combinaciones visibles';
      observer.observe(mx, { childList: true, subtree: true });
    }
    function changePreset() {
      var mode = preset.value, today = localToday();
      from.disabled = to.disabled = mode !== 'custom';
      if (mode === 'all') { from.value = ''; to.value = ''; }
      else if (mode === 'latest') { from.value = latest; to.value = latest; }
      else if (mode === 'today') { from.value = today; to.value = today; }
      else if (mode === '7' || mode === '30') { from.value = offset(today, 1 - Number(mode)); to.value = today; }
      else { if (!from.value) from.value = latest || today; if (!to.value) to.value = latest || today; }
      clearDetail(); apply();
    }
    preset.addEventListener('change', changePreset);
    [from, to].forEach(function (input) { input.addEventListener('change', function () { clearDetail(); apply(); }); });
    document.getElementById('ykTimeReset').addEventListener('click', function () { preset.value = 'all'; changePreset(); });
    // Native search, line changes and cell clicks rebuild the table. Reapply only
    // after its child nodes change; attribute-only filtering cannot loop.
    var observer = new MutationObserver(apply);
    apply();
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"'=]/g, function (c) {
      // Encode '=' too: legacy map enrichment finds the literal __YK__ assignment
      // in the HTML source. Evidence text must not impersonate that boundary.
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '=': '&#61;' }[c];
    });
  }
  function number(value) { return Number(value || 0).toLocaleString('es-MX'); }
  // Read only JSON, never evaluate scripts from a report. Braces/semicolons in
  // source evidence are legal and must not be mistaken for the end of __YK__.
  function snapshotFromHtml(html) {
    var mark = 'window.__YK__=', start = html.indexOf(mark);
    if (start < 0) throw new Error('No se encontró el contenido Yokoten.');
    start += mark.length;
    while (/\s/.test(html.charAt(start)) && start < html.length) start++;
    if (html.charAt(start) !== '{') throw new Error('Contenido Yokoten inválido.');
    var depth = 0, quoted = false, escaped = false;
    for (var i = start; i < html.length; i++) {
      var c = html.charAt(i);
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        var data = JSON.parse(html.slice(start, i + 1));
        if (!Array.isArray(data.rows) || !Array.isArray(data.lines)) throw new Error('La matriz Yokoten está incompleta.');
        return data;
      }
    }
    throw new Error('El contenido Yokoten está truncado.');
  }
  function normalized(value) { return String(value || '').trim().toUpperCase(); }
  function part(value) { return normalized(value).replace(/\s+/g, ''); }
  function lineKey(value) {
    var m = normalized(value).match(/(?:^|[^A-Z])L\s*0*(\d{1,2})(?:$|[^0-9])/);
    return m ? 'L' + Number(m[1]) : normalized(value);
  }
  // Match the existing V20.3 Action Tracker authority, including SKU, revision
  // and line restrictions. Never promote inherited lessons into critical actions.
  function actionsFor(S, cell) {
    return (S.criticalActions || []).filter(function (a) {
      if (normalized(a.status) === 'CANCELLED') return false;
      if (!(normalized(a.product || a.family) === normalized(cell.product) || (a.sku && part(a.sku) === part(cell.sku)))) return false;
      if (a.sku && cell.sku && part(a.sku) !== part(cell.sku)) return false;
      if (a.rev && normalized(a.rev) !== 'N/D' && normalized(a.rev) !== normalized(cell.rev)) return false;
      return !a.line || normalized(a.line) === 'N/D' || lineKey(a.line) === lineKey(cell.line);
    });
  }
  function readingCss() {
    return `
.yk-reading{font:14px/1.5 system-ui,Segoe UI,sans-serif;color:var(--yk-text,#202124);min-width:0;overflow-wrap:anywhere}
.yk-reading *{box-sizing:border-box}.yk-reading h2{font-size:20px;margin:0 0 6px}.yk-reading p{margin:6px 0 12px}
.yk-reading .yk-read-intro{padding:16px;border-top:3px solid #c8102e;border-radius:12px;background:var(--yk-paper,#fff);margin-bottom:12px}
.yk-reading .yk-read-brand{display:flex;gap:10px;align-items:center;margin-bottom:10px;font-weight:800}.yk-read-brand img{width:32px;height:36px;object-fit:contain}
.yk-reading details{border:1px solid var(--yk-border,#dcdde1);border-radius:12px;margin:10px 0;background:var(--yk-paper,#fff)}
.yk-reading summary{padding:14px;cursor:pointer;font-weight:750;min-height:48px;color:var(--yk-text,#202124)}
.yk-reading summary:focus-visible{outline:3px solid #c8102e;outline-offset:2px}.yk-reading summary small{display:block;margin:4px 0 0;font-weight:400;color:var(--yk-muted,#61656d)}
.yk-reading .yk-read-body{padding:0 12px 12px}.yk-reading .yk-read-line{border-radius:8px}.yk-reading .yk-read-line>summary{color:#a70f29}
.yk-reading dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}.yk-reading dl>div{padding:10px;border-radius:8px;background:var(--yk-soft,#f2f2f5)}
.yk-reading dt{font-size:12px;color:var(--yk-muted,#61656d)}.yk-reading dd{margin:3px 0 0;font-weight:700}
.yk-reading .yk-read-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}.yk-reading table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}
.yk-reading th,.yk-reading td{border-bottom:1px solid var(--yk-border,#dcdde1);padding:8px;vertical-align:top}.yk-reading th{background:var(--yk-soft,#f2f2f5)}
.yk-reading h3{font-size:15px;margin:16px 0 8px}.yk-reading .yk-read-action{border-left:3px solid #c8102e;padding:10px 12px;background:var(--yk-soft,#f2f2f5);margin:8px 0}
.yk-reading .yk-read-action p{margin:4px 0;white-space:pre-wrap}.yk-reading .yk-read-muted{color:var(--yk-muted,#61656d);font-size:12px}
#ykStaticReport{margin:12px}.yk-reading [hidden]{display:none!important}
.yk-reading .yk-read-tools{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin:12px 0}.yk-reading label{display:grid;gap:4px;font-weight:700;font-size:12px}
.yk-reading input,.yk-reading select,.yk-reading button{font:inherit;color:var(--yk-text,#202124);background:var(--yk-paper,#fff);border:1px solid var(--yk-border,#dcdde1);border-radius:8px;padding:10px;min-height:44px;min-width:0;max-width:100%}
.yk-reading .yk-read-paging{display:flex;align-items:center;justify-content:space-between;gap:8px}.yk-reading button:disabled{opacity:.45}
@media(max-width:700px){.yk-reading .yk-read-tools{grid-template-columns:1fr}.yk-reading input,.yk-reading select{font-size:16px}.yk-reading summary{font-size:15px}}
`;
  }
  function rowReading(S, row, selectedLine, open) {
    var lines = Object.keys(row.cells || {}).filter(function (l) { return !selectedLine || l === selectedLine; });
    return '<details class="yk-read-product"' + (open ? ' open' : '') + '><summary>' + escapeHtml(row.product || row.sku || 'Producto') + '<small>' + escapeHtml(row.sku) + ' · Rev ' + escapeHtml(row.rev || 'N/D') + ' · ' + lines.length + ' líneas</small></summary><div class="yk-read-body">' + lines.map(function (line) {
      var c = row.cells[line], actions = actionsFor(S, c);
      var facts = c.facts || [], wos = c.wos || [];
      return '<details class="yk-read-line"><summary>' + escapeHtml(line) + '<small>' + (c.exposure ? 'Aplicabilidad Yokoten · sin historial de corrida' : number(c.runs) + ' corridas · ' + number(c.qty) + ' piezas · Última: ' + escapeHtml(c.last || 'sin fecha')) + '</small></summary><div class="yk-read-body"><dl>' + [['WO', wos.length], ['Primera corrida', c.first || 'Sin fecha'], ['Última corrida', c.last || 'Sin fecha'], ['Piezas históricas', number(c.qty)]].map(function (pair) { return '<div><dt>' + pair[0] + '</dt><dd>' + escapeHtml(pair[1]) + '</dd></div>'; }).join('') + '</dl><h3>Historial WO · Common DB</h3>' + (facts.length ? '<div class="yk-read-scroll" tabindex="0" role="region" aria-label="Historial de órdenes"><table><thead><tr><th>WO</th><th>Rev</th><th>Piezas</th><th>Primera</th><th>Última</th></tr></thead><tbody>' + facts.map(function (f) { return '<tr><td>' + escapeHtml(f.wo) + '</td><td>' + escapeHtml(f.rev || 'N/D') + '</td><td>' + number(f.qty) + '</td><td>' + escapeHtml(f.first || 'N/D') + '</td><td>' + escapeHtml(f.last || 'N/D') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p>' + (wos.length ? escapeHtml(wos.join(', ')) : 'Sin WO registrada para esta combinación.') + '</p>') + '<h3>Acciones críticas · Action Tracker</h3>' + (actions.length ? actions.map(function (a) { return '<article class="yk-read-action"><b>' + escapeHtml(a.refdes) + (a.componentPn ? ' · ' + escapeHtml(a.componentPn) : '') + '</b>' + [['Condición', a.condition], ['Motivo', a.reason], ['Acción', a.control], ['Estado', a.status], ['Responsable', a.owner], ['Compromiso', a.due], ['Evidencia', a.evidence], ['Fuente', a.source]].filter(function (x) { return x[1]; }).map(function (x) { return '<p><strong>' + x[0] + ':</strong> ' + escapeHtml(x[1]) + '</p>'; }).join('') + '</article>'; }).join('') : '<p class="yk-read-muted">Sin acciones críticas aplicables en el Action Tracker incluido. Esto no confirma calificación ni ausencia de riesgos.</p>') + '</div></details>';
    }).join('') + '</div></details>';
  }
  function staticReading(S) {
    return '<section id="ykStaticReport" class="yk-reading" aria-label="Lectura compatible sin JavaScript"><div class="yk-read-intro"><h2>Contenido del Yokoten</h2><p>Abre un producto y una línea para consultar el historial WO y las acciones críticas, incluso sin JavaScript.</p><p class="yk-read-muted">' + number(S.rows.length) + ' productos/revisiones · ' + number(S.lines.length) + ' líneas · Corte del archivo: ' + escapeHtml(S.generated || 'N/D') + '</p><p class="yk-read-muted">Esta vista de lectura no incluye el detalle de pruebas, reparaciones, Handoff ni mapas. Para revisarlos y usar los filtros, abre el reporte completo en un navegador. El historial no confirma producción en vivo.</p></div>' + (S.rows.length ? S.rows.map(function (r, i) { return rowReading(S, r, '', i === 0); }).join('') : '<p>No hay historial cargado en Common DB para este reporte.</p>') + '</section>';
  }
  function mobileReportRuntime() {
    var mx = document.getElementById('mx');
    if (!mx) return;
    function mark() {
      var table = mx.querySelector('table');
      if (!table) return;
      document.documentElement.classList.add('yk-interactive-ready');
      var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (n) { return n.textContent.trim(); });
      table.querySelectorAll('tbody tr').forEach(function (row) {
        Array.prototype.forEach.call(row.children, function (td, i) {
          if (!i) return;
          td.setAttribute('data-yk-line', heads[i] || 'Línea');
          td.setAttribute('data-yk-empty', td.querySelector('button[data-k]') ? '0' : '1');
        });
      });
    }
    new MutationObserver(mark).observe(mx, { childList: true, subtree: true });
    mark();
  }
  function transform(html, theme) {
    if (typeof html !== 'string' || html.indexOf('window.__YK__=') < 0) return html;
    // Older wrappers append literal backslash-n separators after these blocks.
    // Limit normalization to those boundaries; report data and JS stay intact.
    html = html.replace(/(<(?:style|script)\b[^>]*\bid=["']smtinel-yokoten-(?:v28-(?:style|runtime)|v203-actions-only-(?:style|runtime))["'][^>]*>[\s\S]*?<\/(?:style|script)>)(?:\\n)+/gi, function (_, block) { return block + '\n'; });
    if (html.indexOf('id="ykEvidenceRadar"') < 0) {
      var radar = '<div id="ykEvidenceRadar" aria-hidden="true"><span class="yk-radar-label">YOKOTEN RADAR</span><div class="yk-radar-disc"><span class="yk-radar-sweep"></span></div></div>';
      html = html.replace(/<\/header>/i, function () { return radar + '</header>'; });
    }
    var style = '<style id="' + VERSION + '">' + exportCss(theme) + '</style>';
    var rx = new RegExp('<style id="' + VERSION + '">[\\s\\S]*?</style>');
    html = rx.test(html) ? html.replace(rx, function () { return style; }) : html.replace(/<\/head>/i, function () { return style + '\n</head>'; });
    if (html.indexOf('id="ykStaticReport"') < 0) {
      var fallback = staticReading(snapshotFromHtml(html));
      html = html.replace(/<\/header>/i, function () { return '</header>' + fallback; });
    }
    if (html.indexOf('id="smtinel-yokoten-time-filter-v1"') < 0) {
      var runtime = '<scr' + 'ipt id="smtinel-yokoten-time-filter-v1">(' + yokotenTimeFilter.toString() + ')();</scr' + 'ipt>';
      html = html.replace(/<\/body>/i, function () { return runtime + '\n</body>'; });
    }
    if (html.indexOf('id="smtinel-yokoten-mobile-runtime-v2"') < 0) {
      var mobile = '<scr' + 'ipt id="smtinel-yokoten-mobile-runtime-v2">(' + mobileReportRuntime.toString() + ')();</scr' + 'ipt>';
      html = html.replace(/<\/body>/i, function () { return mobile + '\n</body>'; });
    }
    return html;
  }
  function previewCss(theme) {
    var base = 'html body #emailModal[data-yk-report="1"] #emailPreview .smt-yokoten-preview';
    var scope = base + ':not(.yk-reading)';
    return base + '{' + palette(theme === 'dark') + 'color:var(--yk-text)!important;background:var(--yk-page)!important}' +
      base + '.yk-reading :is(h2,h3,b,strong,summary,label,dd){color:var(--yk-text)!important}' +
      base + '.yk-reading :is(p,small,dt){color:var(--yk-muted)!important}' +
      base + '.yk-reading :is(th,td,details,div){border-color:var(--yk-border)!important}' +
      base + '.yk-reading th{background:var(--yk-soft)!important;color:var(--yk-text)!important}' +
      base + '.yk-reading td{background:var(--yk-paper)!important;color:var(--yk-text)!important}' +
      scope + ' div,' + scope + ' p,' + scope + ' small,' + scope + ' span,' + scope + ' b,' + scope + ' h2{color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' div{background:var(--yk-paper)!important}' +
      scope + '>div{background:var(--yk-page)!important}' +
      scope + '>div>div:first-child{background:var(--yk-paper)!important;border-top:4px solid var(--yk-accent)!important}' +
      scope + ' p,' + scope + ' small{color:var(--yk-muted)!important}' +
      scope + ' table{background:var(--yk-paper)!important;color:var(--yk-text)!important}' +
      scope + ' th{background:var(--yk-soft)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' td{background:var(--yk-paper)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' tr:nth-child(even) td{background:var(--yk-soft)!important}' + readingCss();
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
  function mountPreview(w, owner) {
    var root = w.document.querySelector('[data-yk-mobile-preview]');
    if (!root || root.__ykMounted) return;
    root.__ykMounted = true;
    function load() {
      root.innerHTML = '<p role="status">Cargando contenido Yokoten…</p>';
      w.setTimeout(function () {
        if (!root.isConnected) return;
        try {
          var build = owner.SMTinelBuildYokotenExportHtml;
          var S = snapshotFromHtml((build.__yokotenAppearanceSource || build).call(owner));
          root.innerHTML = '<div class="yk-read-intro"><div class="yk-read-brand"><img src="/services/8d-converter/smtinel_favicon.png" alt="Logo SMTinel"><span>SMTinel · Yokoten</span></div><h2>Contenido del reporte</h2><p>Busca el producto, abre una línea y revisa sus WO y acciones críticas.</p><p class="yk-read-muted">Vista de lectura · Common DB + Action Tracker. El HTML completo conserva pruebas, reparaciones, Handoff y mapas preparados durante la exportación.</p></div><div class="yk-read-tools"><label>Producto, PN o revisión<input data-yk-search type="search" placeholder="Buscar…"></label><label>Línea<select data-yk-line-filter><option value="">Todas las líneas</option>' + S.lines.map(function (l) { return '<option value="' + escapeHtml(l) + '">' + escapeHtml(l) + '</option>'; }).join('') + '</select></label></div><p data-yk-count role="status" aria-live="polite"></p><div data-yk-rows></div><nav class="yk-read-paging" aria-label="Páginas de productos"><button type="button" data-yk-prev>Anterior</button><span data-yk-page></span><button type="button" data-yk-next>Siguiente</button></nav><p class="yk-read-muted">El filtro de esta vista no recorta el archivo exportado. El historial no confirma producción en vivo.</p><button type="button" data-yk-refresh>Actualizar contenido</button>';
          var q = root.querySelector('[data-yk-search]'), line = root.querySelector('[data-yk-line-filter]'), page = 0;
          function render() {
            var needle = normalized(q.value), selected = line.value;
            var rows = S.rows.filter(function (r) { return (!selected || r.cells[selected]) && (!needle || normalized([r.product, r.sku, r.rev].join(' ')).indexOf(needle) >= 0); });
            var pages = Math.max(1, Math.ceil(rows.length / 12));
            page = Math.max(0, Math.min(page, pages - 1));
            root.querySelector('[data-yk-rows]').innerHTML = rows.length ? rows.slice(page * 12, page * 12 + 12).map(function (r) { return rowReading(S, r, selected, false); }).join('') : '<p>' + (S.rows.length ? 'No hay coincidencias con estos filtros.' : 'No hay historial cargado. Carga Common DB / Production y pulsa Actualizar contenido.') + '</p>';
            root.querySelector('[data-yk-count]').textContent = rows.length + ' de ' + S.rows.length + ' productos/revisiones';
            root.querySelector('[data-yk-page]').textContent = (page + 1) + ' / ' + pages;
            root.querySelector('[data-yk-prev]').disabled = page === 0;
            root.querySelector('[data-yk-next]').disabled = page + 1 >= pages;
          }
          q.addEventListener('input', function () { page = 0; render(); });
          line.addEventListener('change', function () { page = 0; render(); });
          root.querySelector('[data-yk-prev]').onclick = function () { page--; render(); };
          root.querySelector('[data-yk-next]').onclick = function () { page++; render(); };
          root.querySelector('[data-yk-refresh]').onclick = load;
          render();
        } catch (err) {
          root.innerHTML = '<p role="alert">No se pudo cargar la vista: ' + escapeHtml(err.message) + '</p><button type="button">Reintentar vista</button>';
          root.querySelector('button').onclick = load;
        }
      }, 30);
    }
    load();
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
    panel.innerHTML = '<b>Preparando Yokoten</b><p role="status">Se están reuniendo el reporte y los mapas. Al terminar podrás abrirlo, descargarlo o guardarlo en Archivos.</p>';
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
    // Keep the existing Knowledge DB + drawing pipeline. Intercept only its
    // final mobile HTML delivery, never CSVs or other report downloads.
    ev.preventDefault();
    var generation = delivery.generation, panel = deliveryPanel(delivery.doc && delivery.doc.defaultView ? delivery.doc : w.document);
    panel.innerHTML = '<b data-yk-receiving>Reporte preparado</b><p role="status">Creando las opciones para guardarlo…</p>';
    var name = a.download;
    w.fetch(a.href).then(function (r) { if (!r.ok) throw new Error('No se pudo leer el archivo preparado.'); return r.blob(); }).then(function (blob) {
      if (generation !== delivery.generation) return;
      if (delivery.url) window.URL.revokeObjectURL(delivery.url);
      // Own this URL: the old pipeline revokes its temporary URL after 120s.
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
      w.__SMTINEL_LAST_YOKOTEN_EXPORT__ = { at: new Date().toISOString(), bytes: blob.size, name: name, method: 'ready-for-user', build: 'mobile-shainin-v2' };
    }).catch(function (err) {
      if (generation === delivery.generation) panel.innerHTML = '<b>No se pudo preparar el guardado</b><p role="alert">' + escapeHtml(err.message) + ' Vuelve a preparar la exportación.</p>';
    });
  }
  function install(w) {
    var d;
    try { d = w.document; if (!d || !d.head) return; } catch (_) { return; }
    ['SMTinelBuildYokotenExportHtml', 'SMTinelBuildYokotenPreviewHtml'].forEach(function (key) {
      var original = w[key];
      if (typeof original !== 'function' || original.__yokotenAppearanceV1) return;
      var wrapped = function () {
        if (key === 'SMTinelBuildYokotenPreviewHtml' && isMobile(w)) return '<div class="smt-yokoten-preview yk-reading" data-yk-mobile-preview><p role="status">Cargando contenido Yokoten…</p></div>';
        var value = original.apply(this, arguments);
        if (key === 'SMTinelBuildYokotenExportHtml') return transform(value, mode());
        return '<div class="smt-yokoten-preview">' + value + '</div>';
      };
      wrapped.__yokotenAppearanceV1 = true;
      wrapped.__yokotenAppearanceSource = original;
      w[key] = wrapped;
    });
    var owner = builderWindow(w);
    if (owner) {
      var style = d.getElementById(VERSION + '-preview');
      if (!style) { style = d.createElement('style'); style.id = VERSION + '-preview'; d.head.appendChild(style); }
      var css = previewCss(mode()) + sectionCss();
      if (style.textContent !== css) style.textContent = css;
      var type = d.getElementById('reportType'), modal = d.getElementById('emailModal');
      var yokoten = !!(type && type.value === 'YOKOTEN');
      if (modal) {
        if (yokoten && modal.getAttribute('data-yk-report') !== '1') modal.setAttribute('data-yk-report', '1');
        else if (!yokoten && modal.hasAttribute('data-yk-report')) modal.removeAttribute('data-yk-report');
      }
      var preview = d.getElementById('emailPreview');
      if (yokoten && preview && isMobile(w) && !preview.querySelector('[data-yk-mobile-preview]')) {
        preview.innerHTML = '<div class="smt-yokoten-preview yk-reading" data-yk-mobile-preview><p role="status">Cargando contenido Yokoten…</p></div>';
      }
      if (preview && !preview.querySelector('.smt-yokoten-preview') && /Product \/ Revision x Line Matrix/.test(preview.textContent)) {
        var shell = d.createElement('div'); shell.className = 'smt-yokoten-preview';
        while (preview.firstChild) shell.appendChild(preview.firstChild);
        preview.appendChild(shell);
      }
      var note = d.querySelector('.report-preview-head span');
      var noteText = 'Vista de lectura · HTML completo al exportar · Shainin Red X';
      if (note && yokoten && note.textContent !== noteText) note.textContent = noteText;
      if (yokoten) mountPreview(w, owner);
    }
    if (!seen.has(d)) {
      seen.add(d);
      var timer;
      new w.MutationObserver(function () { clearTimeout(timer); timer = setTimeout(function () { install(w); }, 100); }).observe(d.documentElement, { childList: true, subtree: true });
      d.addEventListener('click', function () { install(w); }, true);
      d.addEventListener('click', function (ev) { receiveDownload(w, ev); }, true);
      d.addEventListener('change', function (ev) { if (ev.target.id === 'reportType') setTimeout(function () { install(w); }, 0); }, true);
      // Window capture runs before the legacy document handler, which reports
      // "HTML ready" while its asynchronous parent exporter is still working.
      w.addEventListener('click', function (ev) {
        var button = ev.target && ev.target.closest && ev.target.closest('#downloadEmail');
        var type = d.getElementById('reportType'), owner = builderWindow(w);
        if (!button || !type || type.value !== 'YOKOTEN' || !owner || !isMobile(w)) return;
        ev.preventDefault(); ev.stopImmediatePropagation();
        mobileExport(w, owner);
      }, true);
      d.addEventListener('load', function (ev) { if (ev.target.tagName === 'IFRAME') install(ev.target.contentWindow); }, true);
    }
    Array.prototype.forEach.call(d.querySelectorAll('iframe'), function (frame) { install(frame.contentWindow); });
  }
  new MutationObserver(function () { install(window); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  install(window);
  window.addEventListener('load', function () { install(window); });
  window.addEventListener('pagehide', function (ev) {
    if (!ev.persisted && delivery.url) { window.URL.revokeObjectURL(delivery.url); delivery.url = ''; }
  });
}());
