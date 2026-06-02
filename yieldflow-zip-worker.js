/*
 * SMTinel Yield Flow ZIP Worker
 * Version: 2026-06-02
 * Purpose: move JSZip decompression + CSV/JSON manifest parsing off the React main thread.
 * Worker type: classic worker. Load with new Worker('yieldflow-zip-worker.js').
 */
(function () {
  'use strict';

  var JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  var BATCH_SIZE_DEFAULT = 5;
  var TEXT_CHUNK_SIZE = 256 * 1024;
  var SMALL_FILE_LIMIT = 1000;
  var cancelled = false;
  var activeZip = null;
  var activeImageEntries = Object.create(null);
  var activeJobId = null;

  function post(type, payload, transfer) {
    payload = payload || {};
    payload.type = type;
    payload.jobId = activeJobId;
    self.postMessage(payload, transfer || []);
  }

  function fail(code, err, extra) {
    post('error', Object.assign({
      code: code || 'WORKER_ERROR',
      message: err && err.message ? err.message : String(err || 'Unknown worker error'),
      stack: err && err.stack ? String(err.stack).slice(0, 3000) : ''
    }, extra || {}));
  }

  function assertNotCancelled() {
    if (cancelled) {
      var e = new Error('Import cancelled by user.');
      e.code = 'CANCELLED';
      throw e;
    }
  }

  function idleYield() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  function ensureJSZip() {
    if (self.JSZip) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      try {
        importScripts(JSZIP_CDN);
        if (!self.JSZip) reject(new Error('JSZip no quedó disponible después de importScripts().'));
        else resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function lowerName(name) { return String(name || '').toLowerCase(); }
  function baseName(path) { return String(path || '').split('/').pop() || String(path || ''); }
  function isMacJunk(path) { return /^__MACOSX\//i.test(path || '') || /(^|\/)\.DS_Store$/i.test(path || ''); }
  function isTextEntry(path) { return /\.(csv|tsv|txt)$/i.test(path || ''); }
  function isJsonEntry(path) { return /\.json$/i.test(path || ''); }
  function isImageEntry(path) { return /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(path || ''); }
  function mimeFromName(path) {
    var p = lowerName(path);
    if (/\.png$/.test(p)) return 'image/png';
    if (/\.jpe?g$/.test(p)) return 'image/jpeg';
    if (/\.webp$/.test(p)) return 'image/webp';
    if (/\.gif$/.test(p)) return 'image/gif';
    if (/\.bmp$/.test(p)) return 'image/bmp';
    if (/\.tiff?$/.test(p)) return 'image/tiff';
    return 'application/octet-stream';
  }
  function estSize(entry) {
    try { return Number(entry && entry._data && (entry._data.uncompressedSize || entry._data.compressedSize)) || 0; }
    catch (_) { return 0; }
  }

  function detectRole(path) {
    var p = lowerName(path).replace(/[\s\-]+/g, '_');
    if (/cesium|advanceyield|polaris|yield/.test(p)) return 'cesium';
    if (/repair|reparacion|defect|failure|falla|rma/.test(p)) return 'repair';
    if (/station.*online|station_on_line|work_orders?|build_info|wo_report|wo\b/.test(p)) return 'wo';
    if (/sfc|shop_floor|shopfloor|serial|unit_history|boxsn/.test(p)) return 'sfc';
    if (/calendar|cisco_week|fiscal|week/.test(p)) return 'calendar';
    if (/db[_ ]?model|database.*model|model_catalog|sku.*family/.test(p)) return 'dbmodel';
    if (/bom|bill.*material|component|part.*list/.test(p)) return 'bom';
    return '';
  }

  function roleRank(role) {
    var m = { sfc: 1, repair: 2, cesium: 3, wo: 4, dbmodel: 5, calendar: 6, bom: 7 };
    return m[role] || 99;
  }

  function splitCsvLine(line, delimiter) {
    delimiter = delimiter || ',';
    var out = [], cur = '', q = false;
    line = String(line || '');
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (ch === delimiter && !q) {
        out.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function guessDelimiter(sample) {
    sample = String(sample || '');
    var first = sample.split(/\r?\n/).slice(0, 10).join('\n');
    var candidates = [',', '\t', ';', '|'];
    var best = ',', bestCount = -1;
    candidates.forEach(function (d) {
      var count = (first.match(new RegExp(d === '\t' ? '\\t' : '\\' + d, 'g')) || []).length;
      if (count > bestCount) { bestCount = count; best = d; }
    });
    return best;
  }

  function normalizeHeader(h) {
    return String(h == null ? '' : h).trim().replace(/^\uFEFF/, '');
  }

  function headerScore(headers, role) {
    var joined = headers.map(function (h) { return normalizeHeader(h).toLowerCase(); }).join('|');
    var score = 0;
    function has(re, pts) { if (re.test(joined)) score += pts || 1; }
    if (role === 'sfc') { has(/sn|serial|boxsn|syserial/, 2); has(/wo|work.?order/, 2); has(/current|event|station|status/, 1); }
    else if (role === 'repair') { has(/sn|serial/, 2); has(/fail|symptom|defect|falla/, 2); has(/location|ref|refdes|component/, 1); }
    else if (role === 'cesium') { has(/pass|fail|status|yield/, 2); has(/uut|station|area|test/, 2); has(/rectime|time|date|serial/, 1); }
    else if (role === 'wo') { has(/wo|work.?order/, 2); has(/sku|model|family|line/, 2); has(/date|build/, 1); }
    else if (role === 'calendar') { has(/week|fiscal|cisco/, 2); has(/date|start|end/, 1); }
    else if (role === 'dbmodel') { has(/model|family|sku|bu|business/, 2); }
    else if (role === 'bom') { has(/component|part|ref|bom|qty|description/, 2); }
    return score;
  }

  function findBestHeader(rows, role) {
    var bestIdx = -1, bestScore = 0;
    for (var i = 0; i < Math.min(rows.length, 30); i++) {
      var sc = headerScore(rows[i] || [], role);
      if (sc > bestScore) { bestScore = sc; bestIdx = i; }
    }
    return bestScore >= 3 ? bestIdx : -1;
  }

  function rowsToObjects(rows, role, rowLimit) {
    rowLimit = rowLimit || 250000;
    var idx = findBestHeader(rows, role);
    if (idx < 0) return [];
    var headers = (rows[idx] || []).map(function (h, i) { return normalizeHeader(h) || ('Column_' + (i + 1)); });
    var out = [];
    for (var r = idx + 1; r < rows.length && out.length < rowLimit; r++) {
      var arr = rows[r] || [];
      var obj = {}, nonEmpty = 0;
      for (var c = 0; c < headers.length; c++) {
        var v = arr[c] == null ? '' : String(arr[c]).trim();
        if (v) nonEmpty++;
        obj[headers[c]] = v;
      }
      if (nonEmpty) out.push(obj);
    }
    return out;
  }

  function parseDelimitedUint8Streaming(uint8, role, path, rowLimit, onProgress) {
    var decoder = new TextDecoder('utf-8');
    var delimiter = null;
    var rows = [];
    var carry = '';
    var quotedCarry = false;
    var total = uint8.byteLength || uint8.length || 1;
    var lastPct = -1;

    function pushPhysicalLine(line) {
      if (!delimiter) delimiter = guessDelimiter(line);
      if (quotedCarry) {
        carry += '\n' + line;
      } else {
        carry = line;
      }
      var q = false;
      for (var i = 0; i < carry.length; i++) {
        if (carry[i] === '"') {
          if (q && carry[i + 1] === '"') i++;
          else q = !q;
        }
      }
      quotedCarry = q;
      if (!quotedCarry) {
        if (carry.trim()) rows.push(splitCsvLine(carry, delimiter));
        carry = '';
      }
    }

    for (var offset = 0; offset < uint8.length; offset += TEXT_CHUNK_SIZE) {
      assertNotCancelled();
      var end = Math.min(offset + TEXT_CHUNK_SIZE, uint8.length);
      var text = decoder.decode(uint8.subarray(offset, end), { stream: end < uint8.length });
      var parts = text.split(/\r?\n/);
      if (parts.length) {
        parts[0] = carry + parts[0];
        carry = '';
      }
      for (var p = 0; p < parts.length - 1; p++) {
        pushPhysicalLine(parts[p]);
        if (rows.length > rowLimit + 40) break;
      }
      carry += parts[parts.length - 1] || '';
      var pct = Math.floor((end / total) * 100);
      if (pct !== lastPct && onProgress) { lastPct = pct; onProgress(pct); }
      if (rows.length > rowLimit + 40) break;
    }
    if (carry.trim()) pushPhysicalLine(carry);
    return rowsToObjects(rows, role, rowLimit);
  }

  function rowLimitForRole(role) {
    if (role === 'repair') return 220000;
    if (role === 'cesium' || role === 'sfc' || role === 'wo') return 120000;
    return 50000;
  }

  function parseJsonUint8(uint8) {
    var txt = new TextDecoder('utf-8').decode(uint8);
    var data = JSON.parse(txt);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.rows)) return data.rows;
    if (data && Array.isArray(data.data)) return data.data;
    return [data];
  }

  async function readEntryUint8(entry, progressLabel, globalBase, globalSpan) {
    var last = -1;
    return entry.async('uint8array', function (meta) {
      if (cancelled) throw new Error('Import cancelled by user.');
      var pct = Math.floor(meta.percent || 0);
      if (pct !== last && (pct % 5 === 0 || pct === 100)) {
        last = pct;
        post('progress', {
          progress: Math.min(95, Math.round(globalBase + (pct / 100) * globalSpan)),
          phase: 'DECOMPRESSING_ENTRY',
          message: progressLabel + ' ' + pct + '%',
          fileProgress: pct
        });
      }
    });
  }

  function collectEntries(zip) {
    var text = [], json = [], images = [], other = [];
    activeImageEntries = Object.create(null);
    zip.forEach(function (path, entry) {
      if (!entry || entry.dir || isMacJunk(path)) return;
      var rec = { path: path, entry: entry, size: estSize(entry), role: detectRole(path) };
      if (isTextEntry(path) && rec.role) text.push(rec);
      else if (isJsonEntry(path)) json.push(rec);
      else if (isImageEntry(path)) {
        var id = 'img_' + images.length + '_' + Math.random().toString(36).slice(2, 8);
        rec.id = id;
        rec.mime = mimeFromName(path);
        activeImageEntries[id] = rec;
        images.push({ id: id, path: path, name: baseName(path), size: rec.size, mime: rec.mime });
      } else other.push({ path: path, size: rec.size });
    });
    text.sort(function (a, b) { return roleRank(a.role) - roleRank(b.role) || b.size - a.size; });
    return { text: text, json: json, images: images, other: other };
  }

  async function processTextEntries(entries, options) {
    var parsed = { wo: [], sfc: [], repair: [], calendar: [], dbmodel: [], cesium: [], bom: [] };
    var sheets = [];
    var total = entries.length || 1;
    var batchSize = Math.max(1, Math.min(Number(options.batchSize || BATCH_SIZE_DEFAULT) || BATCH_SIZE_DEFAULT, 5));
    if (entries.length > SMALL_FILE_LIMIT) batchSize = 5;

    for (var i = 0; i < entries.length; i += batchSize) {
      assertNotCancelled();
      var batch = entries.slice(i, i + batchSize);
      for (var j = 0; j < batch.length; j++) {
        var item = batch[j];
        var entryNo = i + j + 1;
        var base = 18 + Math.round(((entryNo - 1) / total) * 58);
        var span = Math.max(1, Math.round(58 / total));
        post('progress', {
          progress: base,
          phase: 'PARSING_' + String(item.role || '').toUpperCase(),
          message: 'Parseando CSV ' + entryNo + '/' + total + ': ' + baseName(item.path),
          currentFile: item.path,
          fileIndex: entryNo,
          fileTotal: total
        });
        var uint8 = await readEntryUint8(item.entry, 'Descomprimiendo ' + baseName(item.path), base, span * 0.45);
        assertNotCancelled();
        var rows = parseDelimitedUint8Streaming(uint8, item.role, item.path, rowLimitForRole(item.role), function (pct) {
          if (pct === 100 || pct % 10 === 0) {
            post('progress', {
              progress: Math.min(86, Math.round(base + span * 0.45 + (pct / 100) * span * 0.55)),
              phase: 'PARSING_' + String(item.role || '').toUpperCase(),
              message: 'Parseando CSV ' + entryNo + '/' + total + ': ' + baseName(item.path) + ' ' + pct + '%',
              fileProgress: pct
            });
          }
        });
        if (rows && rows.length) {
          parsed[item.role] = parsed[item.role].concat(rows);
          sheets.push({ name: baseName(item.path), path: item.path, role: item.role, rows: rows.length, size: item.size });
        }
        uint8 = null;
        await idleYield();
      }
    }
    return { parsed: parsed, sheets: sheets };
  }

  async function processJsonEntries(entries, parsed, sheets) {
    for (var i = 0; i < entries.length; i++) {
      assertNotCancelled();
      var item = entries[i];
      var role = item.role || detectRole(item.path);
      if (!role || !parsed[role]) continue;
      post('progress', { progress: 82, phase: 'PARSING_JSON', message: 'Parseando JSON ' + (i + 1) + '/' + entries.length + ': ' + baseName(item.path) });
      try {
        var uint8 = await readEntryUint8(item.entry, 'Descomprimiendo ' + baseName(item.path), 82, 2);
        var rows = parseJsonUint8(uint8);
        if (rows && rows.length) {
          parsed[role] = parsed[role].concat(rows);
          sheets.push({ name: baseName(item.path), path: item.path, role: role, rows: rows.length, size: item.size });
        }
      } catch (err) {
        post('warning', { code: 'JSON_PARSE_SKIPPED', message: 'JSON omitido: ' + baseName(item.path) + ' - ' + (err.message || err) });
      }
      await idleYield();
    }
  }

  async function startImport(msg) {
    cancelled = false;
    activeJobId = msg.jobId || String(Date.now());
    activeZip = null;
    activeImageEntries = Object.create(null);

    var options = msg.options || {};
    var name = msg.name || 'yieldflow.zip';
    var zipSize = Number(msg.size || (msg.buffer && msg.buffer.byteLength) || 0);

    try {
      post('progress', { progress: 3, phase: 'LOADING_JSZIP', message: 'Inicializando JSZip en Web Worker...' });
      await ensureJSZip();
      assertNotCancelled();

      post('progress', { progress: 9, phase: 'DECOMPRESSING', message: 'Descomprimiendo manifiesto ZIP...' });
      activeZip = await self.JSZip.loadAsync(msg.buffer, {
        optimizedBinaryString: true,
        createFolders: false,
        checkCRC32: false
      });
      msg.buffer = null;
      assertNotCancelled();

      post('progress', { progress: 15, phase: 'INDEXING_MANIFEST', message: 'Indexando archivos internos del ZIP...' });
      var manifest = collectEntries(activeZip);
      post('manifest', {
        progress: 18,
        phase: 'MANIFEST_READY',
        message: 'Manifiesto listo: ' + manifest.text.length + ' CSV/TXT, ' + manifest.images.length + ' imágenes.',
        manifest: {
          textCount: manifest.text.length,
          jsonCount: manifest.json.length,
          imageCount: manifest.images.length,
          otherCount: manifest.other.length,
          images: manifest.images,
          zipSize: zipSize,
          fileName: name
        }
      });

      var result = await processTextEntries(manifest.text, options);
      await processJsonEntries(manifest.json, result.parsed, result.sheets);
      assertNotCancelled();

      post('progress', { progress: 88, phase: 'INDEXING_IMAGES', message: 'Indexando imágenes AOI para lazy loading...' });
      var summaryRows = {};
      Object.keys(result.parsed).forEach(function (k) { summaryRows[k] = (result.parsed[k] || []).length; });

      post('done', {
        progress: 100,
        phase: 'WORKER_DONE',
        message: 'ZIP parseado en worker. Construyendo modelo Yield Flow...',
        parsed: result.parsed,
        sheets: result.sheets,
        images: manifest.images,
        otherCount: manifest.other.length,
        rows: summaryRows,
        fileName: name,
        container: name
      });
    } catch (err) {
      if (err && (err.code === 'CANCELLED' || /cancelled/i.test(err.message || ''))) {
        post('cancelled', { progress: 0, phase: 'CANCELLED', message: 'Import cancelado por el usuario.' });
      } else if (err && /End of data reached|Corrupted zip|Can't find end of central directory|CRC32/i.test(err.message || '')) {
        fail('ZIP_CORRUPT', err);
      } else if (err && /memory|allocation|Array buffer allocation|out of/i.test(err.message || '')) {
        fail('OUT_OF_MEMORY', err, { hint: 'Divide el ZIP o excluye imágenes de alta resolución del paquete de datos.' });
      } else {
        fail('IMPORT_FAILED', err);
      }
    }
  }

  async function requestImage(msg) {
    activeJobId = msg.jobId || activeJobId;
    try {
      assertNotCancelled();
      var rec = activeImageEntries[msg.imageId];
      if (!rec) throw new Error('Imagen no encontrada o ZIP liberado: ' + msg.imageId);
      post('progress', { progress: 90, phase: 'LOADING_IMAGE', message: 'Cargando imagen AOI: ' + baseName(rec.path) });
      var uint8 = await rec.entry.async('uint8array');
      var ab = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
      post('image', { imageId: msg.imageId, path: rec.path, name: baseName(rec.path), mime: rec.mime, buffer: ab }, [ab]);
    } catch (err) {
      fail('IMAGE_LOAD_FAILED', err, { imageId: msg.imageId });
    }
  }

  function release() {
    cancelled = true;
    activeZip = null;
    activeImageEntries = Object.create(null);
    post('released', { phase: 'RELEASED', message: 'Worker ZIP references released.' });
  }

  self.onmessage = function (e) {
    var msg = e.data || {};
    if (msg.type === 'start') startImport(msg);
    else if (msg.type === 'cancel') { cancelled = true; post('cancelled', { phase: 'CANCELLED', message: 'Cancelación recibida.' }); }
    else if (msg.type === 'request-image') requestImage(msg);
    else if (msg.type === 'release') release();
    else if (msg.type === 'ping') { activeJobId = msg.jobId || activeJobId; ensureJSZip().then(function(){ post('ready', { phase: 'READY', message: 'Yield Flow ZIP worker ready.' }); }).catch(function(err){ fail('JSZIP_LOAD_FAILED', err); }); }
  };
}());
