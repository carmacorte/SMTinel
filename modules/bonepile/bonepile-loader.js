/* SMTinel Bonepile Visual Tracker loader v0.1.0 */
(function (window, document) {
  'use strict';
  if (window.__SMTINEL_BONEPILE_LOADER__) return;
  window.__SMTINEL_BONEPILE_LOADER__ = true;

  function baseUrl() {
    try {
      var current = document.currentScript && document.currentScript.src;
      return current ? new URL('.', current).href : 'modules/bonepile/';
    } catch (_) { return 'modules/bonepile/'; }
  }

  function addCss(url) {
    if (document.getElementById('smtinel-bonepile-css')) return;
    var link = document.createElement('link');
    link.id = 'smtinel-bonepile-css'; link.rel = 'stylesheet'; link.href = url;
    document.head.appendChild(link);
  }

  function addScript(url) {
    if (window.SMTinelBonepile || document.querySelector('script[data-smtinel-bonepile]')) return;
    var script = document.createElement('script');
    script.src = url; script.async = false; script.setAttribute('data-smtinel-bonepile', 'true');
    script.onerror = function () { try { console.error('[SMTinel Bonepile] Failed to load', url); } catch (_) {} };
    document.head.appendChild(script);
  }

  var base = baseUrl();
  addCss(base + 'bonepile-module.css?v=0.1.0');
  addScript(base + 'bonepile-module.js?v=0.1.0');
})(window, document);
