/* Run: NODE_PATH=<directory containing linkedom> node tests/yokoten_mobile_export.cjs
   Fixtures only; no production records, network requests, or browser credentials. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const asset = fs.readFileSync(path.join(__dirname, '../assets/smtinel-mobile-export-polish-v2026.js'), 'utf8');
new vm.Script(asset);
const definitions = asset.slice(asset.indexOf("  var VERSION = 'smtinel-yokoten-runs-v3'"), asset.indexOf('  new MutationObserver(function () { install(window); })'));
function environment(html = '<html><head></head><body></body></html>') {
  const dom = parseHTML(html), native = dom.window;
  // Do not assign to Linkedom's defaultView Proxy: its backing object is Node's
  // globalThis, so multiple test windows would leak timers and other globals.
  const target = new native.EventTarget();
  const w = {
    document: dom.document, HTMLSelectElement: native.HTMLSelectElement,
    HTMLElement: native.HTMLElement, Event: native.Event,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target)
  };
  Object.defineProperty(dom.document, 'defaultView', { configurable: true, get: () => w });
  Object.defineProperty(w.HTMLSelectElement.prototype, 'value', {
    configurable: true,
    get() { const o = this.querySelector('option[selected]') || this.querySelector('option'); return o ? (o.getAttribute('value') ?? o.textContent) : ''; },
    set(v) { this.querySelectorAll('option').forEach(o => o.toggleAttribute('selected', (o.getAttribute('value') ?? o.textContent) === v)); }
  });
  const observers = [];
  class Observer { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() {} }
  const timers = [];
  const revoked = [], urls = [];
  Object.assign(w, {
    window: w, top: w, parent: w, MutationObserver: Observer, innerWidth: 390,
    matchMedia: () => ({ matches: true }),
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    setInterval() { return 1; }, clearInterval() {},
    location: { href: 'https://smtinel.com/', origin: 'https://smtinel.com' },
    localStorage: { getItem() { return null; }, setItem() {} },
    URL: { createObjectURL(blob) { urls.push(blob); return 'blob:test/' + urls.length; }, revokeObjectURL(u) { revoked.push(u); } },
    Blob, File, console, alert() {},
  });
  // Linkedom's navigator is a getter; override it only for this test environment.
  Object.defineProperty(w, 'navigator', { configurable: true, value: { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 } });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const ctx = vm.createContext(w);
  vm.runInContext(definitions, ctx);
  return { w, ctx, observers, timers, revoked, urls };
}


function fixture() {
  const wo = [
    { 'Work Orde 00000': '00100', P_NO: 'PN-A', P_VERSION: 'A', 'Line ID': 'L01', 'Time Start': '2026-10-01 06:45:00', 'Build Start Date': '2026-10-15', serial: 'SERIAL_MUST_NOT_EXPORT', station: 'STATION_MUST_NOT_EXPORT' },
    { WO: '100', SKU: 'PN-A', Revision: 'A', Line: 'L1', 'Start Time': '2026-10-02 10:30:00', station: 'ICT_MUST_NOT_EXPORT' },
    { WO: '101', SKU: 'PN-A', Revision: 'A', Line: 'L1', 'Start Time': '2026-10-15 09:00:00' },
    { WO: '102', SKU: 'PN-A', Revision: 'B', Line: 'L2', 'Start Time': '2026-10-10' },
    { WO: '200', SKU: 'PN-B', Revision: 'C', 'Production Line': 'L10', 'Start Time': '10/14/2026 2:30:05 PM' },
    { WO: '201', SKU: 'PN-C', Revision: 'A', Line: 'L2', 'Start Time': '2026-02-31' },
    { WO: '202', SKU: 'PN-UNKNOWN', Line: 'L3' },
    { WO: '203', SKU: 'PN-AMBIGUOUS', Line: 'L4', 'Start Time': '2026-10-12', BU: 'Explicit BU', 'Product Family': 'Explicit MODEL' },
    { WO: '', SKU: 'PN-X', Line: 'L90', 'Start Time': '2026-10-15' },
    { WO: '204', SKU: 'PN-AMBIGUOUS', Line: 'L4' },
    { WO: '205', SKU: 'PN-ESCAPE', Revision: 'A', Line: '__proto__', 'Start Time': '2026-10-13' }
  ];
  const dbmodel = [
    { SKU: 'PN-A', 'Prodcut Family': 'ALPHA', BU: 'Campus' },
    { SKU: 'PN-B', 'Product Family': 'BETA', BU: 'Routing' },
    { SKU: 'PN-C', 'Product Family': 'GAMMA', BU: 'Routing' },
    { SKU: 'PN-AMBIGUOUS', 'Product Family': 'OLD', BU: 'OLD BU' },
    { SKU: 'PN-AMBIGUOUS', 'Product Family': 'NEW', BU: 'NEW BU' },
    { SKU: 'PN-ESCAPE', 'Product Family': 'MODEL </script><script>bad()</script> & "quoted"', BU: 'Special' }
  ];
  const parsed = { wo, dbmodel };
  for (const key of ['sfc', 'repair', 'cesium', 'stations', 'bom']) Object.defineProperty(parsed, key, { get() { throw new Error('Forbidden station/piece data read: ' + key); } });
  Object.defineProperty(wo[0], 'Current Station', { enumerable: true, get() { throw new Error('Unrequested station field read'); } });
  return parsed;
}
function appEnvironment(mobile = true) {
  const e = environment('<html><head></head><body><section id="emailModal"><select id="reportType"><option value="YOKOTEN">Yokoten</option></select><h2 id="reportModalTitle"></h2><p id="reportScopeHint"></p><div class="export-action-panel"><button id="downloadEmail">Export</button></div><div class="report-preview-head"><span>OLD LABEL</span></div><div id="emailPreview">OLD PREVIEW</div></section></body></html>');
  const w = e.w;
  w.matchMedia = () => ({ matches: mobile });
  w.navigator.userAgent = mobile ? 'iPhone' : 'Chrome';
  w.navigator.platform = mobile ? 'iPhone' : 'Linux';
  w.navigator.maxTouchPoints = mobile ? 5 : 0;
  w.SMTINEL_CROSSMODEL_LAST_PARSED = fixture();
  w.SMTinelBuildYokotenExportHtml = () => { throw new Error('Legacy per-piece builder executed'); };
  w.SMTinelBuildYokotenPreviewHtml = () => { throw new Error('Legacy preview executed'); };
  w.SMTinelDownloadYokotenHtml = () => { throw new Error('Legacy download executed'); };
  w.SMTinelYokotenCriticalActionRows = () => { throw new Error('No Action Tracker needed for run-only matrix'); };
  w.fetch = async url => ({ ok: true, blob: async () => e.urls[Number(url.split('/').pop()) - 1] });
  return e;
}
const tick = () => new Promise(resolve => setImmediate(resolve));

async function main() {
  const app = appEnvironment(false), w = app.w;
  const S = w.buildRunSnapshot(w);
  assert.equal(S.schema, 'smtinel.yokoten.runs.v3');
  assert.equal(S.runs.length, 9, 'duplicate WO/station rows collapse; missing WO skipped');
  assert.equal(S.skipped, 1);
  const first = S.runs.find(r => r.wo === '00100');
  assert.equal(first.start, '2026-10-01 06:45:00', 'run start uses Time Start and earliest valid duplicate');
  assert.equal(first.bu, 'CAMPUS');
  assert.equal(first.model, 'ALPHA');
  assert.equal(first.line, 'L1');
  assert.equal(S.runs.find(r => r.wo === '200').start, '2026-10-14 14:30:05');
  assert.equal(S.runs.find(r => r.wo === '201').start, '');
  assert.equal(S.runs.find(r => r.wo === '203').model, 'Explicit MODEL', 'row authority beats conflicting catalog');
  assert.equal(S.runs.find(r => r.wo === '204').bu, 'Sin BU', 'conflicting catalog must not invent BU');
  assert.equal(S.runs.find(r => r.wo === '204').model, 'Modelo no disponible');
  assert.equal(S.runs.find(r => r.wo === '202').rev, 'N/D');
  assert.doesNotMatch(JSON.stringify(S), /MUST_NOT_EXPORT|"actions"|"sfc"|"station"|"qty"/);
  const allowed = ['bu', 'model', 'sku', 'rev', 'line', 'wo', 'start', 'startRaw'];
  for (const run of S.runs) assert.ok(Object.keys(run).every(k => allowed.includes(k)), 'only run metadata exported');
  assert.equal(w.startDate('2026-10-01 12:00 AM'), '2026-10-01 00:00:00');
  assert.equal(w.startDate('2026-10-01 12:00 PM'), '2026-10-01 12:00:00');
  assert.equal(w.startDate('2026-10-01 13:00 PM'), '');
  assert.equal(w.startDate('2026-10-01 25:30'), '');
  assert.equal(w.startDate('2026-10-01 12:30:12.000'), '2026-10-01 12:30:12');
  assert.equal(w.startDate('2026-02-29'), '');
  assert.equal(w.startDate('2024-02-29'), '2024-02-29');
  const serial = (Date.UTC(2026, 9, 1, 6, 30) / 86400000) + 25569;
  assert.equal(w.startDate(serial), '2026-10-01 06:30:00');
  assert.equal(w.startDate('2026-10-15T05:30:00Z'), '2026-10-14 23:30:00', 'explicit zoned timestamps use plant day');
  assert.equal(w.startDate(new Date('2026-10-01T06:30:00Z')), '2026-10-01 06:30:00', 'parsed Excel Date preserves wall-clock fields');
  const fallback = appEnvironment(false);
  fallback.w.SMTINEL_CROSSMODEL_LAST_PARSED = { dbmodel: fixture().dbmodel };
  fallback.w.TRACEOPS_YIELD_RAW_STATION_ON_LINE_ROWS = fixture().wo;
  assert.equal(fallback.w.buildRunSnapshot(fallback.w).runs.length, 9);
  fallback.w.SMTINEL_CROSSMODEL_LAST_PARSED.wo = [];
  assert.equal(fallback.w.buildRunSnapshot(fallback.w).runs.length, 0, 'empty authoritative snapshot does not revive stale fallback');
  console.log('PASS: Common DB/catalog authority, aliases, deduplication, dates, missing values, no station/serial/action access');

  w.install(w);
  assert.equal(w.SMTinelBuildYokotenExportHtml.__yokotenRunsV3, true);
  const exported = w.SMTinelBuildYokotenExportHtml();
  const doc = parseHTML(exported).document;
  assert.equal(doc.querySelectorAll('script').length, 2, 'record HTML cannot inject executable script');
  assert.equal(doc.querySelectorAll('.yk-run').length, 9, 'all runs available without scripts');
  assert.equal(doc.querySelectorAll('.yk-matrix tbody tr').length, 8);
  assert.equal(doc.querySelectorAll('.yk-cell').length, 8, 'no invented exposure cells');
  assert.equal(doc.querySelectorAll('.yk-matrix thead th').length, 7, 'only lines with recorded WO');
  assert.match(doc.querySelector('.yk-matrix').textContent, /MODEL <\/script><script>bad\(\)<\/script> & "quoted"/);
  assert.match(doc.querySelector('.yk-head img').getAttribute('src'), /^data:image\/png;base64,/);
  assert.equal(doc.querySelectorAll('#ykEvidenceRadar').length, 1);
  assert.doesNotMatch(exported, /Current Station|MUST_NOT_EXPORT|testRows|repairRows|handoffRows|__YK__=|YOKOTEN DISPONIBLE/);
  for (const script of doc.querySelectorAll('script')) new vm.Script(script.textContent);
  const css = doc.querySelector('style').textContent;
  const desktopCss = css.split('@media(max-width:700px)')[0];
  assert.match(desktopCss, /\.yk-matrix thead \.yk-product\{[^}]*background:#f0f0f3;color:#202124/);
  assert.doesNotMatch(desktopCss, /\.yk-matrix,\.yk-matrix tbody\{display:block/);
  assert.match(css, /max-width:100%;width:100%;overflow:auto;max-height:70vh/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*\.yk-matrix,\.yk-matrix tbody\{display:block;width:100%;min-width:0/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /ykEvidenceSweep 8s linear infinite/);
  assert.equal(w.document.querySelectorAll('[data-yk-run-frame]').length, 1);
  const frame = w.document.querySelector('[data-yk-run-frame]');
  const initialFrameHtml = frame.srcdoc;
  assert.equal(parseHTML(initialFrameHtml).document.querySelectorAll('.yk-run').length, 9, 'preview and export use same matrix');
  const build = w.SMTinelBuildYokotenExportHtml;
  w.install(w);
  assert.equal(w.SMTinelBuildYokotenExportHtml, build, 'install does not stack wrappers');
  assert.equal(w.document.querySelector('[data-yk-run-frame]'), frame, 'install preserves preview/filter state');
  const observers = app.observers.length;
  app.observers.forEach(o => o.fn());
  app.timers.splice(0).forEach(fn => fn());
  assert.equal(app.observers.length, observers, 'stable installation');
  w.SMTINEL_CROSSMODEL_LAST_PARSED.wo.push({ WO: '999', SKU: 'PN-A', Revision: 'A', Line: 'L9', 'Time Start': '2026-10-15' });
  w.document.querySelector('[data-yk-refresh]').click();
  assert.equal(parseHTML(frame.srcdoc).document.querySelectorAll('.yk-run').length, 10);
  console.log('PASS: static reading, escaping, embedded shield, responsive CSS contract, independent preview, refresh, idempotence');

  const report = environment(exported), rw = report.w, rd = rw.document;
  for (const script of rd.querySelectorAll('script')) vm.runInContext(script.textContent, report.ctx);
  assert.equal(rd.querySelector('[data-yk-controls]').hidden, false);
  function field(k, v, type = 'change') { const input = rd.querySelector('[data-filter="' + k + '"]'); input.value = v; input.dispatchEvent(new rw.Event(type)); }
  const matrix = () => rd.querySelector('[data-yk-matrix]');
  const reset = () => rd.querySelector('[data-yk-reset]').click();
  assert.equal(matrix().querySelectorAll('.yk-run').length, 9);
  field('bu', 'CAMPUS');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 3);
  assert.equal(matrix().querySelectorAll('thead th').length, 3, 'BU filter removes irrelevant line columns');
  assert.match(rd.querySelector('[data-filter="model"]').textContent, /ALPHA/);
  assert.doesNotMatch(rd.querySelector('[data-filter="model"]').textContent, /BETA/);
  field('line', 'L1');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 2);
  assert.equal(matrix().querySelectorAll('thead th').length, 2);
  field('period', 'custom'); field('from', '2026-10-01'); field('to', '2026-10-01');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 1, 'date filters individual starts, not cell latest date');
  assert.match(matrix().textContent, /WO 00100/);
  assert.doesNotMatch(matrix().textContent, /WO 101/);
  field('to', '2026-09-30');
  assert.match(rd.querySelector('[data-yk-count]').textContent, /rango válido/);
  assert.equal(matrix().querySelectorAll('.yk-run').length, 0);
  reset(); field('period', 'latest');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 1);
  assert.match(matrix().textContent, /WO 101/);
  reset(); field('period', 'undated');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 3);
  assert.match(matrix().textContent, /Fecha fuente no reconocida: 2026-02-31/);
  reset(); field('model', 'ALPHA'); field('sku', 'PN-A'); field('rev', 'B'); field('wo', '102');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 1);
  assert.match(matrix().textContent, /L2/);
  reset(); field('q', 'ALPHA 101', 'input');
  assert.equal(matrix().querySelectorAll('.yk-run').length, 1);
  field('q', 'no such run', 'input');
  assert.match(matrix().textContent, /No hay corridas/);
  reset();
  assert.equal(matrix().querySelectorAll('.yk-run').length, 9);
  const larger = { ...S, runs: Array.from({ length: 65 }, (_, i) => ({ bu: 'TEST', model: 'MODEL ' + i, sku: 'PN' + i, rev: 'A', line: 'L1', wo: String(i), start: '2026-10-01' })) };
  const bigHtml = w.reportHtml(larger, w), big = environment(bigHtml);
  assert.equal(big.w.document.querySelectorAll('.yk-run').length, 65, 'static fallback never paginates away source rows');
  for (const script of big.w.document.querySelectorAll('script')) vm.runInContext(script.textContent, big.ctx);
  assert.equal(big.w.document.querySelectorAll('.yk-run').length, 30);
  big.w.document.querySelector('[data-yk-next]').click();
  assert.equal(big.w.document.querySelectorAll('.yk-run').length, 30);
  big.w.document.querySelector('[data-yk-next]').click();
  assert.equal(big.w.document.querySelectorAll('.yk-run').length, 5);
  const empty = environment(w.reportHtml({ ...S, runs: [] }, w));
  for (const script of empty.w.document.querySelectorAll('script')) vm.runInContext(script.textContent, empty.ctx);
  assert.match(empty.w.document.querySelector('[data-yk-matrix]').textContent, /No hay corridas/);
  console.log('PASS: executable export, faceted BU/line/model/SKU/revision/WO/search/date filters, dates per run, empty states and pagination');

  // Desktop executes the new renderer through the same public download entry point.
  assert.equal(w.SMTinelDownloadYokotenHtml(), true);
  assert.equal(app.urls.length, 1);
  assert.equal(w.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__, 0);
  assert.match(await app.urls[0].text(), /smtinel.yokoten.runs.v3/);
  assert.equal(w.document.querySelector('[data-yk-save]'), null, 'desktop uses direct download');
  const mobile = appEnvironment(true), mw = mobile.w;
  mw.install(mw);
  let shareCalls = 0, gesture = false;
  mw.navigator.canShare = () => true;
  mw.navigator.share = info => { assert.ok(gesture, 'share must be inside a new tap'); assert.equal(info.files[0].type, 'text/html'); shareCalls++; return Promise.resolve(); };
  mw.mobileExport(mw, mw);
  assert.equal(mobile.urls.length, 1, 'first URL belongs to download function');
  await tick();
  assert.equal(mobile.urls.length, 2, 'delivery owns a separate URL for Safari');
  assert.ok(mw.document.querySelector('[data-yk-save]'));
  assert.equal(mw.document.querySelector('[data-yk-save]').href, 'blob:test/2');
  assert.equal(mw.__SMTINEL_LAST_YOKOTEN_EXPORT__.method, 'ready-for-user');
  assert.equal(await mobile.urls[0].text(), await mobile.urls[1].text(), 'completed HTML preserved byte for byte');
  gesture = true;
  mw.document.querySelector('[data-yk-share]').click();
  gesture = false;
  assert.equal(shareCalls, 1);
  mw.navigator.share = () => Promise.reject(Object.assign(new Error(), { name: 'AbortError' }));
  mw.document.querySelector('[data-yk-share]').click();
  await tick();
  assert.match(mw.document.querySelector('[data-yk-save-status]').textContent, /cancelada/);
  let intercepted = false;
  mw.receiveDownload(mw, { target: mw.document.querySelector('[data-yk-save]'), preventDefault() { intercepted = true; } });
  assert.equal(intercepted, false, 'user-save anchor is never intercepted again');
  const csv = mw.document.createElement('a'); csv.download = 'SMTinel_Yokoten_Selected.csv'; csv.href = 'blob:csv';
  mw.receiveDownload(mw, { target: csv, preventDefault() { intercepted = true; } });
  assert.equal(intercepted, false, 'other file types unaffected');
  mobile.timers.splice(0).forEach(fn => fn());
  assert.ok(mobile.revoked.includes('blob:test/1'));
  assert.ok(!mobile.revoked.includes('blob:test/2'), 'prepared URL survives temporary source URL revocation');
  mw.navigator.canShare = () => false;
  mw.mobileExport(mw, mw);
  await tick();
  assert.equal(mw.document.querySelector('[data-yk-share]'), null);
  assert.ok(mw.document.querySelector('[data-yk-save]'), 'download still available without file share');
  assert.ok(mobile.revoked.includes('blob:test/2'), 'previous owned URL released on replacement');
  console.log('PASS: desktop download, mobile prepare/open/save/share, fresh gesture, cancellation, byte preservation, URL lifetime, exclusions');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
