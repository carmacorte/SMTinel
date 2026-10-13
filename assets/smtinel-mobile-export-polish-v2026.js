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
    return document.documentElement.classList.contains('smtinel-theme-light') ? 'light' : 'dark';
  }
  function palette(dark) {
    return dark
      ? '--yk-page:#141719;--yk-paper:#22272b;--yk-soft:#2b3236;--yk-text:#ffffff;--yk-muted:#d0d6da;--yk-border:#59646c;--yk-accent:#adc59a;'
      : '--yk-page:#f5f7f4;--yk-paper:#ffffff;--yk-soft:#edf1eb;--yk-text:#171b18;--yk-muted:#49544c;--yk-border:#c6cec8;--yk-accent:#405c35;';
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
@media print{html:root{${palette(false)}color-scheme:light}html body header{position:static!important}}
`;
  }
  function transform(html, theme) {
    if (typeof html !== 'string' || html.indexOf('window.__YK__=') < 0) return html;
    var style = '<style id="' + VERSION + '">' + exportCss(theme) + '</style>';
    var rx = new RegExp('<style id="' + VERSION + '">[\\s\\S]*?</style>');
    return rx.test(html) ? html.replace(rx, function () { return style; }) : html.replace(/<\/head>/i, function () { return style + '\n</head>'; });
  }
  function previewCss(theme) {
    var scope = 'html body #emailPreview .smt-yokoten-preview';
    return scope + '{' + palette(theme === 'dark') + 'color:var(--yk-text)!important;background:var(--yk-page)!important}' +
      scope + ' div,' + scope + ' p,' + scope + ' small,' + scope + ' span,' + scope + ' b,' + scope + ' h2{color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' div{background:var(--yk-paper)!important}' +
      scope + '>div{background:var(--yk-page)!important}' +
      scope + '>div>div:first-child{background:var(--yk-paper)!important;border-top:4px solid var(--yk-accent)!important}' +
      scope + ' p,' + scope + ' small{color:var(--yk-muted)!important}' +
      scope + ' table{background:var(--yk-paper)!important;color:var(--yk-text)!important}' +
      scope + ' th{background:var(--yk-soft)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' td{background:var(--yk-paper)!important;color:var(--yk-text)!important;border-color:var(--yk-border)!important}' +
      scope + ' tr:nth-child(even) td{background:var(--yk-soft)!important}';
  }
  function install(w) {
    var d;
    try { d = w.document; if (!d || !d.head) return; } catch (_) { return; }
    ['SMTinelBuildYokotenExportHtml', 'SMTinelBuildYokotenPreviewHtml'].forEach(function (key) {
      var original = w[key];
      if (typeof original !== 'function' || original.__yokotenAppearanceV1) return;
      var wrapped = function () {
        var value = original.apply(this, arguments);
        if (key === 'SMTinelBuildYokotenExportHtml') return transform(value, mode());
        return '<div class="smt-yokoten-preview">' + value + '</div>';
      };
      wrapped.__yokotenAppearanceV1 = true;
      w[key] = wrapped;
    });
    if (typeof w.SMTinelBuildYokotenExportHtml === 'function') {
      var style = d.getElementById(VERSION + '-preview');
      if (!style) { style = d.createElement('style'); style.id = VERSION + '-preview'; d.head.appendChild(style); }
      var css = previewCss(mode());
      if (style.textContent !== css) style.textContent = css;
      var preview = d.getElementById('emailPreview');
      if (preview && !preview.querySelector('.smt-yokoten-preview') && /Product \/ Revision x Line Matrix/.test(preview.textContent)) {
        var shell = d.createElement('div'); shell.className = 'smt-yokoten-preview';
        while (preview.firstChild) shell.appendChild(preview.firstChild);
        preview.appendChild(shell);
      }
      var note = d.querySelector('.report-preview-head span');
      if (note && preview && preview.querySelector('.smt-yokoten-preview') && /original light layout/.test(note.textContent)) note.textContent = 'Preview y exportación comparten el tema seleccionado';
    }
    if (!seen.has(d)) {
      seen.add(d);
      var timer;
      new w.MutationObserver(function () { clearTimeout(timer); timer = setTimeout(function () { install(w); }, 100); }).observe(d.documentElement, { childList: true, subtree: true });
      d.addEventListener('click', function () { install(w); }, true);
      d.addEventListener('load', function (ev) { if (ev.target.tagName === 'IFRAME') install(ev.target.contentWindow); }, true);
    }
    Array.prototype.forEach.call(d.querySelectorAll('iframe'), function (frame) { install(frame.contentWindow); });
  }
  new MutationObserver(function () { install(window); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  install(window);
  window.addEventListener('load', function () { install(window); });
}());

