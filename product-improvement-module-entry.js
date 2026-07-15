/* SMTinel Product Improvement visible module entry */
(function () {
  'use strict';

  var TILE_ID = 'smtinel-product-improvement-module';
  var VERSION = 'product-improvement-module-v2';
  var WAIT_LIMIT_MS = 12000;

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    var style = window.getComputedStyle