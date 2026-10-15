/* Run: NODE_PATH=<directory containing linkedom> node tests/yokoten_mobile_export.cjs
   Fixtures only; no production records, network requests, or browser credentials. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const asset = fs.readFileSync(path.join(__dirname, '../assets/smtinel-mobile-export-polish-v2026.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
new vm.Script(asset);
const definitions = asset.slice(asset.indexOf("  var VERSION = 'smtinel-yokoten-appearance-v1'"), asset.indexOf('  new MutationObserver(function () { install(window); })'));
const data = {
  generated: '2026-10-15T10:00:00Z', lines: ['L1', 'L2'], rows: [],
  testRows: [], handoffRows: [], repairRows: [], trackerSaved: {},
  criticalActions: [
    { product: 'MODEL 0', sku: 'PN-0', rev: 'A', line: 'L01', refdes: 'U1', control: 'Check paste', status: 'Open', evidence: 'Literal window.__YK__={} and };(function(){ and </script><script>bad()</script> must be text' },
    { product: 'MODEL 0', sku: 'PN-0', rev: 'B', line: 'L1', refdes: 'U2', control: 'Wrong revision' },
    { product: 'MODEL 0', sku: 'OTHER', line: 'L1', refdes: 'U3', control: 'Wrong PN' },
    { product: 'MODEL 0', sku: 'PN-0', line: 'L2', refdes: 'U4', control: 'Other line' }
  ]
};
for (let i = 0; i < 25; i++) {
  const c = { key: `CELL${i}`, product: `MODEL ${i}`, sku: `PN-${i}`, rev: 'A', line: 'L1', qty: 20 + i, runs: 1, wos: [`WO${i}`], first: '2026-10-01', last: i ? '2026-10-01' : '2026-10-15', facts: [{ wo: `WO${i}`, rev: 'A', qty: 20 + i, first: '2026-10-01', last: '2026-10-15' }], status: 'History only', inherited: [], qual: {} };
  data.rows.push({ product: c.product, sku: c.sku, rev: c.rev, cells: { L1: c } });
}
const exposure = { ...data.rows[0].cells.L1, key: 'EXP0', line: 'L2', exposure: true, last: '', first: '', wos: [], facts: [], qty: 0, runs: 0 };
data.rows[0].cells.L2 = exposure;
const snapshot = JSON.stringify(data);
const baseStart = source.indexOf('function yokotenExportHtml(){');
const baseEnd = source.indexOf('function yokotenPreviewHtml(){', baseStart);
const original = vm.runInNewContext(source.slice(baseStart, baseEnd) + '\nyokotenExportHtml();', { yokotenExportSnapshot: () => data });

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

async function main() {
  const e = environment();
  assert.equal(JSON.stringify(e.w.snapshotFromHtml(original)), snapshot);
  const transformed = e.w.transform(original, 'light');
  assert.equal(JSON.stringify(e.w.snapshotFromHtml(transformed)), snapshot, 'snapshot bytes/data unchanged');
  assert.equal(JSON.stringify(data), snapshot, 'input not mutated');
  assert.equal(e.w.transform(transformed, 'light'), transformed, 'transform idempotent');
  assert.equal(e.w.actionsFor(data, data.rows[0].cells.L1).length, 1, 'exact SKU/revision/line authority');
  assert.throws(() => e.w.snapshotFromHtml('window.__YK__={"rows":['), /truncado/);
  const staticDoc = parseHTML(transformed).document;
  assert.equal(staticDoc.querySelectorAll('#ykEvidenceRadar').length, 1);
  assert.equal(staticDoc.querySelectorAll('#ykStaticReport .yk-read-product').length, 25, 'all products present without JS');
  assert.match(staticDoc.querySelector('#ykStaticReport').textContent, /WO24/);
  assert.equal(staticDoc.querySelectorAll('#ykStaticReport script').length, 0, 'evidence is escaped');
  assert.match(staticDoc.querySelector('#ykStaticReport').textContent, /Check paste/);
  assert.doesNotMatch(staticDoc.querySelector('#ykStaticReport').textContent, /Wrong revision|Wrong PN/);
  assert.match(transformed, /#c8102e/);
  assert.match(transformed, /prefers-reduced-motion/);
  assert.match(transformed, /ykEvidenceSweep 8s linear infinite/);
  assert.match(transformed, /html:not\(\.yk-interactive-ready\) body>\.wrap/);
  for (const script of staticDoc.querySelectorAll('script')) new vm.Script(script.textContent);
  console.log('PASS: real export template, JSON integrity, escaping, static reading, Action Tracker matching, theme/radar, idempotence');

  // Compose the actual production export wrappers, not just a synthetic shell.
  const chain = environment();
  chain.w.SMTinelBuildYokotenExportHtml = () => original;
  const wrapperIds = new Set([
    'smtinel-yokoten-color-semantics-runtime-v9', 'smtinel-yokoten-qualification-controller-v10',
    'smtinel-yokoten-history-export-wrapper-v11', 'smtinel-yokoten-es-blue-export-wrapper-v14',
    'smtinel-yokoten-export-support-v17-1', 'smtinel-yokoten-export-finalizer-wrapper-v19',
    'smtinel-yokoten-friendly-export-wrapper-v196', 'smtinel-yokoten-operational-export-v19-7',
    'smtinel-yokoten-run-history-export-v19-7', 'smtinel-yokoten-v28-final-export',
    'smtinel-yokoten-critical-refs-v20-export'
  ]);
  for (const m of source.slice(baseEnd).matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)) {
    if (wrapperIds.has(m[1])) { vm.runInContext(m[2], chain.ctx, { filename: m[1] }); wrapperIds.delete(m[1]); }
  }
  assert.equal(wrapperIds.size, 0);
  const final = chain.w.transform(chain.w.SMTinelBuildYokotenExportHtml(), 'light');
  const normalizedFinal = final.replace(/<\\\/script><script id=["']smtinel-yokoten-export-evidence-runtime-v17-1["']>/i, '</script><script id="smtinel-yokoten-export-evidence-runtime-v17-1">');
  const finalDoc = parseHTML(normalizedFinal).document;
  for (const s of finalDoc.querySelectorAll('script')) new vm.Script(s.textContent, { filename: s.id || 'base' });
  assert.equal(JSON.stringify(chain.w.snapshotFromHtml(normalizedFinal)), snapshot);
  assert.equal(finalDoc.querySelectorAll('#ykStaticReport .yk-read-product').length, 25);
  assert.ok(finalDoc.querySelector('#smtinel-yokoten-v203-actions-only-runtime'));
  assert.ok(finalDoc.querySelector('#smtinel-yokoten-time-filter-v1'));
  assert.ok(finalDoc.querySelector('#smtinel-yokoten-mobile-runtime-v2'));
  console.log('PASS: all 11 production wrappers, final script syntax, V20.3 authority and mobile/date runtime retained');

  const r = environment(transformed);
  const scripts = [...r.w.document.querySelectorAll('script')];
  scripts.forEach(s => vm.runInContext(s.textContent, r.ctx));
  assert.equal(r.w.document.querySelectorAll('#mx button[data-k]').length, 26);
  assert.ok(r.w.document.documentElement.classList.contains('yk-interactive-ready'));
  assert.equal(r.w.document.querySelector('#mx td[data-yk-line]').getAttribute('data-yk-line'), 'L1');
  assert.equal(r.w.document.querySelectorAll('#ykTimeFilter').length, 1);
  const preset = r.w.document.getElementById('ykTimePreset');
  preset.value = 'latest'; preset.dispatchEvent(new r.w.Event('change'));
  assert.equal(r.w.document.querySelectorAll('#mx tr[hidden]').length, 24);
  assert.equal(r.w.document.querySelectorAll('#mx .yk-time-out').length, 25);
  preset.value = 'custom'; preset.dispatchEvent(new r.w.Event('change'));
  r.w.document.getElementById('ykTimeFrom').value = '2026-10-30';
  r.w.document.getElementById('ykTimeTo').value = '2026-10-01';
  r.w.document.getElementById('ykTimeTo').dispatchEvent(new r.w.Event('change'));
  assert.match(r.w.document.getElementById('ykTimeStatus').textContent, /rango válido/);
  r.w.document.getElementById('ykTimeReset').click();
  assert.equal(r.w.document.querySelectorAll('#mx tr[hidden]').length, 0);
  assert.equal(JSON.stringify(r.w.__YK__), snapshot);
  console.log('PASS: interactive report, stacked line labels, time filter/reset, exposure exclusion, snapshot preserved');

  const shell = '<html><head></head><body><div id="emailModal"><select id="reportType"><option>YOKOTEN</option><option>TEST</option></select><div class="export-action-panel"><button id="downloadEmail">Export</button></div><div class="report-preview-head"><span>old note</span></div><div id="emailPreview">Mobile export mode</div></div></body></html>';
  const app = environment(shell), w = app.w;
  w.SMTinelBuildYokotenExportHtml = () => original;
  w.SMTinelBuildYokotenPreviewHtml = () => 'Preview is suppressed on mobile';
  w.install(w);
  // Flush just the preview mount; observer scheduling is tested separately.
  app.timers.shift()();
  assert.equal(w.document.querySelector('#emailModal').getAttribute('data-yk-report'), '1');
  assert.equal(w.document.querySelectorAll('.yk-read-product').length, 12, 'DOM paginated');
  w.document.querySelector('[data-yk-next]').click();
  w.document.querySelector('[data-yk-next]').click();
  assert.match(w.document.querySelector('[data-yk-rows]').textContent, /MODEL 24/);
  assert.equal(w.document.querySelectorAll('.yk-read-product').length, 1);
  const q = w.document.querySelector('[data-yk-search]');
  q.value = 'PN-0'; q.dispatchEvent(new w.Event('input'));
  assert.equal(w.document.querySelectorAll('.yk-read-product').length, 1);
  const line = w.document.querySelector('[data-yk-line-filter]');
  line.value = 'L2'; line.dispatchEvent(new w.Event('change'));
  assert.equal(w.document.querySelectorAll('.yk-read-line').length, 1);
  assert.match(w.document.querySelector('[data-yk-rows]').textContent, /sin historial de corrida/);
  w.install(w);
  assert.equal(w.document.querySelectorAll('[data-yk-mobile-preview]').length, 1);
  assert.equal(w.document.querySelector('[data-yk-search]').value, 'PN-0', 'install preserves filter state');
  w.document.getElementById('reportType').value = 'TEST'; w.install(w);
  assert.equal(w.document.getElementById('emailModal').hasAttribute('data-yk-report'), false, 'other reports not restyled');
  console.log('PASS: mobile preview mounting, pagination/search/line, idempotent observer install, isolated report styling');

  w.document.getElementById('reportType').value = 'YOKOTEN'; w.install(w);
  let exports = 0;
  w.SMTinelDownloadYokotenHtml = () => { exports++; w.__SMTINEL_YOKOTEN_EXPORT_ACTIVE_V196__ = 1; };
  w.mobileExport(w, w); w.mobileExport(w, w);
  assert.equal(exports, 1, 'duplicate preparation prevented');
  assert.ok(w.document.getElementById('downloadEmail').disabled);
  const a = w.document.createElement('a');
  a.download = 'SMTinel_Yokoten_Operativo_V20.3_2026-10-15.html'; a.href = 'blob:original'; w.document.body.appendChild(a);
  w.fetch = async () => ({ ok: true, blob: async () => new Blob([transformed], { type: 'text/html' }) });
  let prevented = false, shares = 0;
  w.navigator.canShare = () => true;
  w.navigator.share = () => { shares++; return Promise.resolve(); };
  w.receiveDownload(w, { target: a, preventDefault() { prevented = true; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(prevented, 'old async synthetic mobile download blocked');
  assert.equal(shares, 0, 'share never called without a new tap');
  assert.ok(w.document.querySelector('[data-yk-save]'));
  assert.ok(w.document.querySelector('[data-yk-open]'));
  assert.equal(w.document.querySelector('[data-yk-save]').href, 'blob:test/1');
  assert.equal(w.__SMTINEL_LAST_YOKOTEN_EXPORT__.method, 'ready-for-user');
  assert.equal(await app.urls[0].text(), transformed, 'completed drawing-enriched Blob is not rebuilt or truncated');
  w.document.querySelector('[data-yk-share]').click();
  assert.equal(shares, 1, 'share called synchronously on tap');
  w.navigator.share = () => Promise.reject(Object.assign(new Error(), { name: 'AbortError' }));
  w.document.querySelector('[data-yk-share]').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(w.document.querySelector('[data-yk-save-status]').textContent, /cancelada/);
  let bypass = false;
  w.receiveDownload(w, { target: w.document.querySelector('[data-yk-save]'), preventDefault() { bypass = true; } });
  assert.equal(bypass, false, 'user download not intercepted recursively');
  a.download = 'SMTinel_Yokoten_Selected_Cell_Tracker.csv';
  w.receiveDownload(w, { target: a, preventDefault() { bypass = true; } });
  assert.equal(bypass, false, 'CSV not intercepted');
  a.download = 'SMTinel_Yokoten_Operativo_V20.3_2026-10-15.html';
  w.navigator.canShare = () => false;
  w.receiveDownload(w, { target: a, preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(w.document.querySelector('[data-yk-share]'), null, 'unsupported file sharing is not offered');
  assert.ok(w.document.querySelector('[data-yk-save]'));
  assert.ok(app.revoked.includes('blob:test/1'), 'old owned URL released only on replacement');
  console.log('PASS: async mobile delivery, fresh share gesture, cancellation, Blob byte preservation, own URL lifetime, CSV/user-save exclusion');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
