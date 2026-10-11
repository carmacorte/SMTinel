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
