/*
 * SMTinel Yield Flow bootstrap.
 *
 * The original worker integration is preserved in
 * yieldflow-main-thread-patch.original.js. Runtime fixes load sequentially so
 * model ownership is resolved first, Station_on_line_report enriches every
 * serial with its physical production line, and external UI modules can attach
 * safely after the core application is available.
 */
(function () {
  'use strict';

  function resolve(name) {
    try {
      var current = document.currentScript && document.currentScript.src;
      return current ? new URL(name, current).href : name;
    } catch (_) {
      return name;
    }
  }

  var scripts = [
    resolve('yieldflow-main-thread-patch.original.js'),
    resolve('board-impact-model-fix.js'),
    resolve('yieldflow-line-mapping.js'),
    resolve('modules/bonepile/bonepile-menu-integration.js?v=0.1.0')
  ];

  function appendSequentially(index) {
    index = index || 0;
    if (index >= scripts.length) return;
    var script = document.createElement('script');
    script.src = scripts[index];
    script.async = false;
    script.onload = function () { appendSequentially(index + 1); };
    script.onerror = function () {
      try { console.error('[SMTinel Yield Flow] No se pudo cargar:', scripts[index]); } catch (_) {}
      appendSequentially(index + 1);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    scripts.forEach(function (src) {
      document.write('<script src="' + src + '"><\/script>');
    });
  } else {
    appendSequentially(0);
  }
}());
