/* SMTinel Product Improvement context adapter
 * Exposes the currently rendered Yield by Work Order table to the XLSX exporter.
 * This keeps the export compatible with the existing monolithic index without
 * coupling it to private React state.
 */
(function () {
  'use strict';

  var VERSION = 'product-improvement-context-v1';

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function number(value) {
    var cleaned = text(value).replace(/,/g, '').replace(/%/g, '');
    var n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }

  function normalizeHeader(value) {
    return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  }

  function findYieldTable() {
    var tables = Array.prototype.slice.call(document.querySelectorAll('table'));
    return tables.find(function (table) {
      var headerText = text(table.querySelector('thead') ? table.querySelector('thead').textContent : table.textContent).toUpperCase();
      return headerText.indexOf('WEEK') >= 0 &&
        headerText.indexOf('PRODUCT FAMILY') >= 0 &&
        headerText.indexOf('SKU') >= 0 &&
        headerText.indexOf('WO') >= 0 &&
        headerText.indexOf('YIELD') >= 0 &&
        headerText.indexOf('OJT') >= 0 &&
        headerText.indexOf('UNITS') >= 0 &&
        headerText.indexOf('RISK') >= 0;
    }) || null;
  }

  function readTableRows(table) {
    if (!table) return [];
    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead th'));
    if (!headerCells.length) {
      var firstRow = table.querySelector('tr');
      headerCells = firstRow ? Array.prototype.slice.call(firstRow.children) : [];
    }
    var headers = headerCells.map(function (cell) { return normalizeHeader(cell.textContent); });
    var bodyRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    if (!bodyRows.length) {
      bodyRows = Array.prototype.slice.call(table.querySelectorAll('tr')).slice(1);
    }

    return bodyRows.map(function (tr) {
      var cells = Array.prototype.slice.call(tr.children).map(function (cell) { return text(cell.textContent); });
      var raw = Object.create(null);
      headers.forEach(function (header, index) { raw[header] = cells[index] || ''; });
      var units = number(raw.UNITS);
      var risk = number(raw.RISK);
      var yieldPct = number(raw.YIELD);
      var ojtPct = number(raw.OJT);
      return {
        week: raw.WEEK || '',
        line: raw.LINE || '',
        family: raw['PRODUCT FAMILY'] || raw.MODEL || '',
        productFamily: raw['PRODUCT FAMILY'] || raw.MODEL || '',
        sku: raw.SKU || '',
        skuno: raw.SKU || '',
        wo: raw.WO || '',
        workOrder: raw.WO || '',
        units: units,
        total: units,
        risk: risk,
        fail: risk,
        clean: Math.max(0, units - risk),
        yield: yieldPct,
        touch: ojtPct,
        ojt: ojtPct,
        severity: raw.SEV || '',
        topSymptom: raw.SYMPTOM || raw.DEFECT || raw['TOP DEFECT'] || 'N/D'
      };
    }).filter(function (row) {
      return !!(row.week || row.family || row.sku || row.wo);
    });
  }

  function findTextExact(value) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('span,div,p,strong,b'));
    return nodes.find(function (node) { return text(node.textContent) === value; }) || null;
  }

  function readFocusRange(rows) {
    var weeks = rows.map(function (row) { return row.week; }).filter(Boolean);
    var start = '';
    var end = '';
    var detail = findTextExact('DETALLE DEL RANGO');
    if (detail && detail.parentElement) {
      var scope = detail.parentElement.parentElement || detail.parentElement;
      var content = text(scope.textContent);
      var startMatch = content.match(/Inicio\s+(FY\d{4}\s+Q\d\s+W-?\d+)/i);
      var endMatch = content.match(/Fin\s+(FY\d{4}\s+Q\d\s+W-?\d+)/i);
      if (startMatch) start = text(startMatch[1]);
      if (endMatch) end = text(endMatch[1]);
    }
    return {
      start: start || weeks[weeks.length - 1] || '',
      end: end || weeks[0] || ''
    };
  }

  function readScope() {
    var bodyText = text(document.body && document.body.textContent);
    var scopeMatch = bodyText.match(/SCOPE\s+([A-Z0-9_-]+)\s+sin filtro adicional/i);
    return { bu: scopeMatch ? scopeMatch[1] : 'ALL' };
  }

  function refreshContext() {
    var table = findYieldTable();
    if (!table) return false;
    var rows = readTableRows(table);
    if (!rows.length) return false;
    window.TRACEOPS_YIELD_PRODUCT_EXPORT_CONTEXT = {
      model: {
        rows: rows,
        source: 'Yield by Work Order DOM adapter',
        actionTracker: window.TRACEOPS_YIELD_ACTION_LIST || []
      },
      filters: readScope(),
      focusRange: readFocusRange(rows),
      version: VERSION,
      capturedAt: new Date().toISOString()
    };
    return true;
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('#smtinel-product-improvement-export') : null;
    if (target) refreshContext();
  }, true);

  var observer = new MutationObserver(function () { refreshContext(); });
  function start() {
    refreshContext();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.traceOpsRefreshProductImprovementContext = refreshContext;
  window.TRACEOPS_PRODUCT_IMPROVEMENT_CONTEXT_VERSION = VERSION;
}());
