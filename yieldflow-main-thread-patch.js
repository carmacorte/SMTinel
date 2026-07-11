/*
 * SMTinel Yield Flow bootstrap.
 *
 * The original worker integration is preserved in
 * yieldflow-main-thread-patch.original.js. The ownership fix is loaded directly
 * after it so Board Impact resolves model scope from the SKU owned by each SFC
 * serial, while parent/daughter relationships remain contextual metadata only.
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

  var originalUrl = resolve('yieldflow-main-thread-patch.original.js');
  var fixUrl = resolve('board-impact-model-fix.js');

  function appendSequentially() {
    var original = document.createElement('script');
    original.src = originalUrl;
    original.async = false;
    original.onload = function () {
      var fix = document.createElement('script');
      fix.src = fixUrl;
      fix.async = false;
      document.head.appendChild(fix);
    };
    document.head.appendChild(original);
  }

  if (document.readyState === 'loading') {
    document.write('<script src="' + originalUrl + '"><\/script>');
    document.write('<script src="' + fixUrl + '"><\/script>');
  } else {
    appendSequentially();
  }
}());
