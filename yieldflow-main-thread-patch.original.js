/*
 * SMTinel Yield Flow main-thread patch for workerized ZIP import.
 * Paste after existing ensureZipTools/loadExternalScript definitions and before the React App handler,
 * or include as a separate classic script after index HTML functions are available.
 */
(function () {
  'use strict';

  var WORKER_URL = (function () {
    try {
      var node = document.getElementById('smtinel-yieldflow-zip-worker-source');
      if (node && node.textContent) {
        return URL.createObjectURL(new Blob([node.textContent], { type: 'text/javascript' }));
      }
    } catch (_) {}
    return 'yieldflow-zip-worker.js';
  })();
  var DB_NAME = 'SMTinelYieldFlowZipCache';
  var DB_VERSION = 1;
  var STORE = 'parsedZipByHash';
  var HASH_PREFIX = 'smtinel:yf:ziphash:';
  var activeController = null;
  var imageObjectUrls = new Map();

  function scheduleIdle(fn, timeout) {
    if (window.requestIdleCallback) return window.requestIdleCallback(fn, { timeout: timeout || 1500 });
    return setTimeout(fn, 0);
  }

  function traceOpsYieldPreloadZipWorkerOnIdle() {
    if (window.__smtinelYieldZipWorkerPreloaded) return;
    window.__smtinelYieldZipWorkerPreloaded = true;
    scheduleIdle(function () {
      try {
        var w = new Worker(WORKER_URL);
        var done = false;
        var kill = function () { if (!done) { done = true; try { w.terminate(); } catch (_) {} } };
        w.onmessage = kill;
        w.onerror = kill;
        w.postMessage({ type: 'ping', jobId: 'preload_' + Date.now() });
        setTimeout(kill, 4000);
      } catch (err) {
        console.warn('[SMTinel Yield Flow] Worker preload skipped:', err);
      }
    }, 1200);
  }

  window.traceOpsYieldPreloadZipWorkerOnIdle = traceOpsYieldPreloadZipWorkerOnIdle;

  function openDb() {
    return new Promise(function (resolve) {
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'hash' });
        };
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function () { resolve(null); };
      } catch (_) { resolve(null); }
    });
  }

  function dbGet(hash) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        if (!db) return resolve(null);
        try {
          var tx = db.transaction(STORE, 'readonly');
          var req = tx.objectStore(STORE).get(hash);
          req.onsuccess = function () { try { db.close(); } catch (_) {} resolve(req.result || null); };
          req.onerror = function () { try { db.close(); } catch (_) {} resolve(null); };
        } catch (_) { try { db.close(); } catch (__) {} resolve(null); }
      });
    });
  }

  function dbPut(record) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        if (!db) return resolve(false);
        try {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(record);
          tx.oncomplete = function () { try { db.close(); } catch (_) {} resolve(true); };
          tx.onerror = function () { try { db.close(); } catch (_) {} resolve(false); };
        } catch (_) { try { db.close(); } catch (__) {} resolve(false); }
      });
    });
  }

  function localStorageGet(hash) {
    try {
      var raw = localStorage.getItem(HASH_PREFIX + hash);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function localStoragePut(record) {
    try {
      localStorage.setItem(HASH_PREFIX + record.hash, JSON.stringify(record));
      return true;
    } catch (_) { return false; }
  }

  async function sha256File(file, onProgress) {
    var chunkSize = 4 * 1024 * 1024;
    var chunks = [];
    var read = 0;
    for (var offset = 0; offset < file.size; offset += chunkSize) {
      if (window.smtinelImportAbortAssert) window.smtinelImportAbortAssert();
      var buf = await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer();
      chunks.push(new Uint8Array(buf));
      read += buf.byteLength;
      if (onProgress) onProgress(Math.round((read / Math.max(1, file.size)) * 100));
      await new Promise(function (r) { setTimeout(r, 0); });
    }
    var merged = new Uint8Array(read);
    var pos = 0;
    chunks.forEach(function (c) { merged.set(c, pos); pos += c.length; });
    chunks.length = 0;
    var digest = await crypto.subtle.digest('SHA-256', merged.buffer);
    return Array.prototype.map.call(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function readFileAsArrayBufferChunkAware(file, onProgress) {
    // JSZip still needs a full ArrayBuffer. Chunked reading prevents one long FileReader task
    // and lets the overlay update before the worker receives the transferable object.
    var threshold = 50 * 1024 * 1024;
    if (file.size <= threshold) {
      return file.arrayBuffer().then(function (ab) { if (onProgress) onProgress(100); return ab; });
    }
    var chunkSize = 8 * 1024 * 1024;
    var parts = [];
    var total = 0;
    return (async function () {
      for (var offset = 0; offset < file.size; offset += chunkSize) {
        if (window.smtinelImportAbortAssert) window.smtinelImportAbortAssert();
        var ab = await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer();
        var u = new Uint8Array(ab);
        parts.push(u);
        total += u.length;
        if (onProgress) onProgress(Math.round((total / Math.max(1, file.size)) * 100));
        await new Promise(function (r) { setTimeout(r, 0); });
      }
      var merged = new Uint8Array(total);
      var pos = 0;
      parts.forEach(function (p) { merged.set(p, pos); pos += p.length; });
      parts.length = 0;
      return merged.buffer;
    }());
  }

  function revokeYieldImageUrls() {
    imageObjectUrls.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (_) {} });
    imageObjectUrls.clear();
  }

  window.traceOpsYieldRevokeImageUrls = revokeYieldImageUrls;

  function requestYieldImageObjectUrl(imageId) {
    return new Promise(function (resolve, reject) {
      if (imageObjectUrls.has(imageId)) return resolve(imageObjectUrls.get(imageId));
      if (!activeController || !activeController.worker) return reject(new Error('No active Yield Flow worker for image lazy loading.'));
      activeController.imageResolvers[imageId] = { resolve: resolve, reject: reject };
      activeController.worker.postMessage({ type: 'request-image', jobId: activeController.jobId, imageId: imageId });
    });
  }

  window.traceOpsYieldRequestImageObjectUrl = requestYieldImageObjectUrl;

  function normalizeWorkerError(msg) {
    var code = msg && msg.code ? msg.code : 'IMPORT_FAILED';
    var message = msg && msg.message ? msg.message : 'Yield Flow import failed.';
    if (code === 'ZIP_CORRUPT') return 'ZIP corrupto o incompleto. Exporta de nuevo el paquete desde WhatsApp/Cesium y valida que el archivo abra localmente.';
    if (code === 'OUT_OF_MEMORY') return 'Memoria insuficiente durante la importación. Usa ZIP sin imágenes pesadas o divide el paquete por semana/modelo.';
    if (code === 'TIMEOUT') return 'Timeout de importación. El ZIP es demasiado grande o contiene demasiados archivos pequeños.';
    return message;
  }

  function traceOpsYieldCancelActiveImport() {
    if (window.smtinelImportAbort) {
      try { window.smtinelImportAbort(); } catch (_) {}
    }
    if (activeController && activeController.worker) {
      try { activeController.worker.postMessage({ type: 'cancel', jobId: activeController.jobId }); } catch (_) {}
      try { activeController.worker.terminate(); } catch (_) {}
    }
    activeController = null;
    revokeYieldImageUrls();
    if (window.smtinelZipWaitHide) window.smtinelZipWaitHide(150);
  }

  window.traceOpsYieldCancelActiveImport = traceOpsYieldCancelActiveImport;

  function wireOverlayCancelButton() {
    setTimeout(function () {
      try {
        var overlay = document.querySelector('.traceops-yf-import-overlay');
        if (!overlay || overlay.getAttribute('data-worker-cancel-wired') === 'true') return;
        overlay.setAttribute('data-worker-cancel-wired', 'true');
        var btn = overlay.querySelector('[data-yf-cancel], .traceops-yf-import-close, button[aria-label="Close"], button[aria-label="Cerrar"]');
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-yf-cancel', 'true');
          btn.textContent = 'Cancelar';
          btn.style.cssText = 'position:absolute;right:18px;top:18px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font-weight:800;padding:8px 12px;cursor:pointer';
          overlay.appendChild(btn);
        }
        btn.addEventListener('click', traceOpsYieldCancelActiveImport, { once: false });
      } catch (_) {}
    }, 50);
  }

  async function traceOpsYieldImportZipViaWorker(file, options) {
    options = options || {};
    if (!file) throw new Error('No se seleccionó archivo.');
    if (!/\.zip$/i.test(file.name || '')) return null;
    if (!window.Worker) return null;
    if (!window.crypto || !crypto.subtle) return null;

    var jobId = 'yfzip_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var startedAt = Date.now();
    var timeoutMs = Math.max(120000, Number(options.timeoutMs || 0) || (file.size > 100 * 1024 * 1024 ? 420000 : 240000));

    if (window.smtinelImportAbortReset) window.smtinelImportAbortReset();
    if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(4, 'HASHING_ZIP', 'Calculando hash SHA-256 del ZIP...');
    wireOverlayCancelButton();

    var hash = await sha256File(file, function (p) {
      var pct = Math.min(10, 4 + Math.round(p * 0.06));
      if (options.onProgress) options.onProgress(pct, 'HASHING_ZIP', 'Calculando hash SHA-256 ' + p + '%...');
      if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(pct, 'HASHING_ZIP', 'Calculando hash SHA-256 ' + p + '%...');
    });

    var cached = await dbGet(hash) || localStorageGet(hash);
    if (cached && cached.summary) {
      if (options.onProgress) options.onProgress(100, 'CACHE_HIT', 'Cache IndexedDB aplicado por SHA-256.');
      if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(100, 'CACHE_HIT', 'Cache local aplicado por SHA-256.');
      return Object.assign({}, cached.summary, { cacheHit: true, hash: hash });
    }

    var buffer = await readFileAsArrayBufferChunkAware(file, function (p) {
      var pct = 10 + Math.round(p * 0.07);
      if (options.onProgress) options.onProgress(pct, 'READING_FILE', 'Leyendo ZIP por chunks ' + p + '%...');
      if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(pct, 'READING_FILE', 'Leyendo ZIP por chunks ' + p + '%...');
    });

    return new Promise(function (resolve, reject) {
      var worker;
      var timeoutId;
      var settled = false;
      function finish(err, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (worker) {
          try { worker.postMessage({ type: 'release', jobId: jobId }); } catch (_) {}
        }
        activeController = null;
        if (err) reject(err); else resolve(value);
      }

      try {
        worker = new Worker(WORKER_URL);
      } catch (err) {
        return finish(err);
      }

      activeController = { worker: worker, jobId: jobId, imageResolvers: Object.create(null) };

      timeoutId = setTimeout(function () {
        try { worker.postMessage({ type: 'cancel', jobId: jobId }); } catch (_) {}
        try { worker.terminate(); } catch (_) {}
        finish(new Error('Timeout de importación Yield Flow.'));
      }, timeoutMs);

      worker.onerror = function (err) { finish(new Error(err && err.message ? err.message : 'Worker error.')); };
      worker.onmessage = function (e) {
        var msg = e.data || {};
        if (msg.jobId && msg.jobId !== jobId) return;
        if (msg.type === 'progress' || msg.type === 'manifest') {
          if (options.onProgress) options.onProgress(msg.progress || 0, msg.phase || 'WORKER', msg.message || 'Procesando ZIP...');
          if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(msg.progress || 0, msg.phase || 'WORKER', msg.message || 'Procesando ZIP...');
          return;
        }
        if (msg.type === 'warning') {
          console.warn('[SMTinel Yield Flow Worker]', msg.message || msg);
          return;
        }
        if (msg.type === 'image') {
          var resolver = activeController && activeController.imageResolvers[msg.imageId];
          if (resolver) {
            try {
              var blob = new Blob([msg.buffer], { type: msg.mime || 'application/octet-stream' });
              var url = URL.createObjectURL(blob);
              imageObjectUrls.set(msg.imageId, url);
              delete activeController.imageResolvers[msg.imageId];
              resolver.resolve(url);
            } catch (err) { resolver.reject(err); }
          }
          return;
        }
        if (msg.type === 'cancelled') {
          return finish(new Error('Import cancelado por el usuario.'));
        }
        if (msg.type === 'error') {
          return finish(new Error(normalizeWorkerError(msg)));
        }
        if (msg.type === 'done') {
          (async function () {
            try {
              if (options.onProgress) options.onProgress(90, 'BUILDING_INDEX', 'Construyendo índices Yield Flow en hilo principal...');
              if (window.smtinelZipWaitShow) window.smtinelZipWaitShow(90, 'BUILDING_INDEX', 'Construyendo índices Yield Flow...');
              var parsed = msg.parsed || {};
              var cachedMerge = window.traceOpsYieldMergeCachedCommon ? await window.traceOpsYieldMergeCachedCommon(parsed) : null;
              if (window.traceOpsYieldHasCommonPayload && window.traceOpsYieldHasCommonPayload(parsed) && window.traceOpsYieldSaveCommonPayload) {
                await window.traceOpsYieldSaveCommonPayload(parsed, file.name);
              }
              if (!window.traceOpsYieldBuildFromImported) throw new Error('traceOpsYieldBuildFromImported no está disponible. Carga este patch después de las funciones Yield Flow.');
              var isCommonOnly = window.traceOpsYieldHasCommonPayload && window.traceOpsYieldHasBuPayload ? (window.traceOpsYieldHasCommonPayload(parsed) && !window.traceOpsYieldHasBuPayload(parsed)) : false;
              var summary = window.traceOpsYieldBuildFromImported(parsed.wo || [], parsed.sfc || [], parsed.repair || [], {
                source: isCommonOnly ? 'COMMON DB local' : 'ZIP Worker local',
                mode: isCommonOnly ? 'common-cache-worker' : 'worker-text-import',
                fileName: file.name,
                importStartMs: startedAt,
                workbookName: 'Worker parsed ZIP package',
                container: file.name,
                sheets: msg.sheets || [],
                images: msg.images || [],
                hash: hash,
                notes: 'Importación workerizada: JSZip en Web Worker, CSV chunked, imágenes AOI por lazy object URL, cache IndexedDB por SHA-256.'
              }, parsed.calendar || [], parsed.dbmodel || [], parsed.cesium || [], parsed.bom || []);
              summary.hash = hash;
              summary.workerImport = true;
              summary.imageManifest = msg.images || [];
              summary.importMs = Date.now() - startedAt;
              await dbPut({ hash: hash, savedAt: new Date().toISOString(), fileName: file.name, size: file.size, summary: summary });
              localStoragePut({ hash: hash, savedAt: new Date().toISOString(), fileName: file.name, size: file.size, summary: summary });
              parsed = null;
              finish(null, summary);
            } catch (err) { finish(err); }
          }());
        }
      };

      worker.postMessage({
        type: 'start',
        jobId: jobId,
        name: file.name,
        size: file.size,
        buffer: buffer,
        options: { batchSize: 5 }
      }, [buffer]);
      buffer = null;
    });
  }

  window.traceOpsYieldImportZipViaWorker = traceOpsYieldImportZipViaWorker;

  /*
   * Use inside the existing React handleYieldFlowZipImport(file):
   * Replace only the import call branch, not the rest of your state updates.
   */
  window.traceOpsYieldWorkerImportSnippet = async function (file, options) {
    var summary = await traceOpsYieldImportZipViaWorker(file, options || {});
    if (summary) return summary;
    if (!window.traceOpsYieldImportExcelZip) throw new Error('Fallback traceOpsYieldImportExcelZip no disponible.');
    return window.traceOpsYieldImportExcelZip(file, options || {});
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) {
      var t = String((e.target && e.target.textContent) || '');
      if (/Yield Flow|Load ZIP|Cargar ZIP/i.test(t)) traceOpsYieldPreloadZipWorkerOnIdle();
    }, true);
  });
}());
