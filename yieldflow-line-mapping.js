/*
 * SMTinel Yield Flow station-line ownership patch.
 *
 * Resolves the physical production line from Station_on_line_report by WO,
 * annotates SFC / Repair / Cesium rows, and splits the station-sequence
 * breakdown by Station + Line. The React table is decorated with a Line
 * column without duplicating the large index.html implementation.
 */
(function () {
  'use strict';

  var FIX_VERSION = 'station-line-v1';
  var CACHE_MARKER = 'smtinel:yield-line-mapping';
  var UNKNOWN_LINE = 'N/D';
  var BUILD_WRAP_FLAG = '__smtinelLineOwnershipWrapped';
  var BREAKDOWN_WRAP_FLAG = '__smtinelStationLineBreakdownWrapped';

  var SERIAL_KEYS = [
    'SN', 'SERIAL', 'SERIAL NUMBER', 'SERIALNUMBER', 'SYS SERIAL NO',
    'SYSSERIALNO', 'SFC SN', 'SFCSN', 'BOXSN', 'BARCODE'
  ];
  var WO_KEYS = [
    'WO', 'WORK ORDER', 'WORKORDER', 'WORK_ORDER', 'WORKORDERNO',
    'WORK ORDER NO', 'WORK ORDER NUMBER', 'WORK ORDE 00000', 'JOB'
  ];
  var LINE_KEYS = [
    'LINE', 'PRODUCTION LINE', 'PRODUCTIONLINE', 'LINE ID', 'LINEID',
    'SMT LINE', 'SMTLINE', 'SMTINEL LINE'
  ];
  var DATE_KEYS = [
    'DATE', 'BUILD DATE', 'BUILDDATE', 'START SMT', 'STARTSMT',
    'START TIME', 'STARTTIME', 'SCAN DATETIME', 'SCANDATETIME',
    'EVENT TIME', 'EVENTTIME', 'TESTDATE', 'RECORDTIME', 'RECORD TIME'
  ];
  var STATION_KEYS = [
    'CURRENT EVENT', 'CURRENTEVENT', 'SFCSTATION', 'EVENT', 'STATION',
    'CURRENT STATION', 'CURRENTSTATION', 'TESTSTATION', 'TEST AREA', 'TESTAREA'
  ];

  function norm(value) {
    return String(value == null ? '' : value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  function normKey(value) {
    return norm(value).replace(/[^A-Z0-9]/g, '');
  }

  function indexRow(row) {
    var out = Object.create(null);
    Object.keys(row || {}).forEach(function (key) {
      out[normKey(key)] = row[key];
    });
    return out;
  }

  function pick(row, aliases) {
    if (!row) return '';
    var indexed = indexRow(row);
    for (var i = 0; i < aliases.length; i++) {
      var value = indexed[normKey(aliases[i])];
      if (value != null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  }

  function cleanSn(value) {
    if (typeof window.traceOpsYieldCleanSn === 'function') {
      try { return window.traceOpsYieldCleanSn(value); } catch (_) {}
    }
    return norm(value).replace(/[^A-Z0-9]/g, '');
  }

  function normalizeWorkOrder(value) {
    var raw = norm(value);
    if (!raw) return '';
    raw = raw.replace(/\.0+$/, '');
    if (/^\d+$/.test(raw)) return raw.replace(/^0+(?=\d)/, '');
    return raw.replace(/[^A-Z0-9]/g, '');
  }

  function normalizeLine(value) {
    var raw = norm(value);
    if (!raw) return '';
    var lineMatch = raw.match(/(?:^|\b)(?:LINE|L)\s*[-_#:]?\s*(\d{1,3})(?:\b|$)/i);
    if (!lineMatch && /^\d{1,3}$/.test(raw)) lineMatch = [raw, raw];
    if (lineMatch) return 'L' + String(parseInt(lineMatch[1], 10));
    return raw.replace(/\s+/g, '');
  }

  function normalizeStation(value) {
    if (typeof window.traceOpsYieldNormalizeSequenceStation === 'function') {
      try { return window.traceOpsYieldNormalizeSequenceStation(value); } catch (_) {}
    }
    return norm(value).replace(/[\s-]+/g, '_');
  }

  function parseTime(value) {
    if (value == null || String(value).trim() === '') return 0;
    if (value instanceof Date) return value.getTime();
    var raw = String(value).trim();
    var parsed = Date.parse(raw);
    if (!isNaN(parsed)) return parsed;
    var m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return 0;
    var year = Number(m[3]);
    if (year < 100) year += 2000;
    return new Date(year, Number(m[1]) - 1, Number(m[2]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)).getTime();
  }

  function lineSortValue(line) {
    var m = String(line || '').match(/\d+/);
    return m ? Number(m[0]) : 9999;
  }

  function getRowTime(row) {
    return parseTime(pick(row, DATE_KEYS));
  }

  function buildWoLineMap(woRows) {
    var selected = Object.create(null);
    var lineSets = Object.create(null);
    var validRows = 0;

    (woRows || []).forEach(function (row, rowIndex) {
      var wo = normalizeWorkOrder(pick(row, WO_KEYS));
      var line = normalizeLine(pick(row, LINE_KEYS));
      if (!wo || !line) return;
      validRows += 1;
      if (!lineSets[wo]) lineSets[wo] = Object.create(null);
      lineSets[wo][line] = true;

      var candidate = {
        wo: wo,
        line: line,
        time: getRowTime(row),
        rowIndex: rowIndex,
        source: 'Station_on_line_report'
      };
      var current = selected[wo];
      if (!current || candidate.time > current.time ||
          (candidate.time === current.time && candidate.rowIndex < current.rowIndex)) {
        selected[wo] = candidate;
      }
    });

    var ambiguous = 0;
    Object.keys(selected).forEach(function (wo) {
      var alternatives = Object.keys(lineSets[wo] || {}).sort(function (a, b) {
        return lineSortValue(a) - lineSortValue(b) || a.localeCompare(b);
      });
      selected[wo].alternatives = alternatives;
      selected[wo].ambiguous = alternatives.length > 1;
      selected[wo].confidence = alternatives.length > 1 ? 'MEDIUM' : 'HIGH';
      if (selected[wo].ambiguous) ambiguous += 1;
    });

    return {
      byWo: selected,
      validRows: validRows,
      uniqueWo: Object.keys(selected).length,
      ambiguousWo: ambiguous
    };
  }

  function annotateLine(row, info) {
    if (!row || !info || !info.line) return;
    row.__smtinelLine = info.line;
    row.__smtinelLineSource = info.source || 'Station_on_line_report';
    row.__smtinelLineConfidence = info.confidence || 'HIGH';
    row.__smtinelLineAlternatives = info.alternatives || [info.line];
    row['SMTinel Line'] = info.line;
    row['SMTinel Line Source'] = row.__smtinelLineSource;
    row['SMTinel Line Confidence'] = row.__smtinelLineConfidence;
    if (!pick(row, LINE_KEYS)) row.Line = info.line;

    var station = normalizeStation(pick(row, STATION_KEYS));
    if (station) {
      row.__smtinelLocationKey = station + '|' + info.line;
      row['SMTinel Location Key'] = row.__smtinelLocationKey;
    }
  }

  function resolveRowLine(row, maps, bySn) {
    var direct = normalizeLine(pick(row, LINE_KEYS));
    if (direct) {
      return { line: direct, source: 'ROW', confidence: 'HIGH', alternatives: [direct] };
    }
    var sn = cleanSn(pick(row, SERIAL_KEYS));
    if (sn && bySn && bySn[sn]) return bySn[sn];
    var wo = normalizeWorkOrder(pick(row, WO_KEYS));
    if (wo && maps.byWo[wo]) return maps.byWo[wo];
    return null;
  }

  function canonicalizeLines(woRows, sfcRows, repairRows, cesiumRows) {
    woRows = woRows || [];
    sfcRows = sfcRows || [];
    repairRows = repairRows || [];
    cesiumRows = cesiumRows || [];

    var maps = buildWoLineMap(woRows);
    var bySn = Object.create(null);
    var repairSn = Object.create(null);
    var matched = 0;

    repairRows.forEach(function (row) {
      var sn = cleanSn(pick(row, SERIAL_KEYS));
      if (sn) repairSn[sn] = true;
    });

    sfcRows.forEach(function (row) {
      var info = resolveRowLine(row, maps, bySn);
      var sn = cleanSn(pick(row, SERIAL_KEYS));
      if (info) {
        annotateLine(row, info);
        matched += 1;
        if (sn) bySn[sn] = {
          line: info.line,
          source: info.source,
          confidence: info.confidence,
          alternatives: info.alternatives
        };
      }
      if (sn && repairSn[sn]) row.__smtinelHasRepair = true;
    });

    repairRows.forEach(function (row) {
      var info = resolveRowLine(row, maps, bySn);
      if (info) annotateLine(row, info);
      row.__smtinelHasRepair = true;
    });

    cesiumRows.forEach(function (row) {
      var info = resolveRowLine(row, maps, bySn);
      if (info) annotateLine(row, info);
    });

    var meta = {
      version: FIX_VERSION,
      source: 'Station_on_line_report.txt',
      rule: 'WORK_ORDER_TO_LATEST_LINE',
      validPresetRows: maps.validRows,
      uniqueWorkOrders: maps.uniqueWo,
      ambiguousWorkOrders: maps.ambiguousWo,
      sfcRows: sfcRows.length,
      matchedSfcRows: matched,
      unmatchedSfcRows: Math.max(0, sfcRows.length - matched),
      coveragePct: sfcRows.length ? Number(((matched / sfcRows.length) * 100).toFixed(1)) : 0
    };

    window.TRACEOPS_YIELD_LINE_BY_WO = maps.byWo;
    window.TRACEOPS_YIELD_LINE_BY_SN = bySn;
    window.TRACEOPS_YIELD_REPAIR_SN_SET = repairSn;
    window.TRACEOPS_YIELD_LINE_MAPPING_META = meta;

    return { wo: woRows, sfc: sfcRows, repair: repairRows, cesium: cesiumRows, maps: maps, bySn: bySn, meta: meta };
  }

  function installBuildWrapper() {
    var original = window.traceOpsYieldBuildFromImported;
    if (typeof original !== 'function' || original[BUILD_WRAP_FLAG]) return false;

    function wrapped(woRows, sfcRows, repairRows, meta, calendarRows, dbmodelRows, cesiumRows, bomRows) {
      var fixed = canonicalizeLines(woRows, sfcRows, repairRows, cesiumRows);
      var result = original.call(
        this,
        fixed.wo,
        fixed.sfc,
        fixed.repair,
        meta,
        calendarRows,
        dbmodelRows,
        fixed.cesium,
        bomRows
      );
      if (result && typeof result === 'object') result.lineMapping = fixed.meta;
      return result;
    }

    wrapped[BUILD_WRAP_FLAG] = true;
    wrapped.__smtinelOriginal = original;
    window.traceOpsYieldBuildFromImported = wrapped;
    return true;
  }

  function emptyAging() {
    return {
      '0_30': { count: 0, serials: [] },
      '31_60': { count: 0, serials: [] },
      '61_90': { count: 0, serials: [] },
      '91_365': { count: 0, serials: [] },
      'gt_365': { count: 0, serials: [] }
    };
  }

  function agingDays(row) {
    if (typeof window.traceOpsRecoveryDaysFromBuild === 'function') {
      try {
        var days = window.traceOpsRecoveryDaysFromBuild(row || {});
        return days == null || isNaN(Number(days)) ? null : Number(days);
      } catch (_) {}
    }
    return null;
  }

  function agingBucket(days) {
    if (days == null || isNaN(Number(days))) return null;
    days = Number(days);
    if (days <= 30) return '0_30';
    if (days <= 60) return '31_60';
    if (days <= 90) return '61_90';
    if (days <= 365) return '91_365';
    return 'gt_365';
  }

  function latestFtBySerial() {
    var out = Object.create(null);
    var rows = window.TRACEOPS_YIELD_FT_ROWS || [];
    rows.forEach(function (row, rowIndex) {
      var sn = cleanSn(pick(row, SERIAL_KEYS) || row.sn || row.sysserialno);
      var station = normalizeStation(pick(row, STATION_KEYS) || row.station || row.area);
      if (!sn || !station) return;
      var time = getRowTime(row) || parseTime(row.recordTime || row.testDate || row.date || row.testdate);
      var current = out[sn];
      if (!current || time > current.time || (time === current.time && rowIndex > current.rowIndex)) {
        out[sn] = { station: station, time: time, rowIndex: rowIndex, row: row };
      }
    });
    return out;
  }

  function serialRecordsFromGlobals() {
    var sfcMap = window.TRACEOPS_YIELD_SN_TO_SFC || {};
    var lineBySn = window.TRACEOPS_YIELD_LINE_BY_SN || {};
    var repairsBySn = window.TRACEOPS_YIELD_REPAIRS_BY_SN || {};
    var repairSet = window.TRACEOPS_YIELD_REPAIR_SN_SET || {};
    var ftLatest = latestFtBySerial();
    var out = [];

    Object.keys(sfcMap).forEach(function (key) {
      var row = sfcMap[key] || {};
      var sn = cleanSn(row.sn || row.sfcSn || key);
      if (!sn) return;
      var station = normalizeStation(row.event || row.currentEvent || row.station || row.sfcstation || '');
      if (ftLatest[sn] && ftLatest[sn].station) station = ftLatest[sn].station;
      var info = lineBySn[sn] || null;
      var line = normalizeLine(row.line || row.__smtinelLine || row['SMTinel Line'] || (info && info.line));
      var days = agingDays(row);
      out.push({
        sn: sn,
        station: station || 'UNMAPPED',
        line: line || UNKNOWN_LINE,
        data: row,
        days: days,
        repair: !!(row.__smtinelHasRepair || repairSet[sn] || (repairsBySn[sn] && repairsBySn[sn].length))
      });
    });
    return out;
  }

  function collectFromBaseRows(baseRows) {
    var out = [];
    var seen = Object.create(null);
    (baseRows || []).forEach(function (base) {
      var station = normalizeStation(base.station || base.code || '');
      var aging = base.aging || {};
      Object.keys(aging).forEach(function (bucket) {
        var serials = aging[bucket] && aging[bucket].serials;
        (serials || []).forEach(function (entry) {
          var data = entry && entry.data ? entry.data : entry || {};
          var sn = cleanSn((entry && entry.sn) || data.sn || data.sfcSn);
          if (!sn || seen[sn]) return;
          seen[sn] = true;
          var info = (window.TRACEOPS_YIELD_LINE_BY_SN || {})[sn];
          out.push({
            sn: sn,
            station: station,
            line: normalizeLine(data.line || data.__smtinelLine || data['SMTinel Line'] || (info && info.line)) || UNKNOWN_LINE,
            data: data,
            days: entry && entry.days != null ? Number(entry.days) : agingDays(data),
            repair: !!(data.__smtinelHasRepair || (window.TRACEOPS_YIELD_REPAIR_SN_SET || {})[sn] || ((window.TRACEOPS_YIELD_REPAIRS_BY_SN || {})[sn] || []).length)
          });
        });
      });
    });
    return out;
  }

  function setCountAliases(row, qty, clean, repair) {
    row.qty = qty;
    row.units = qty;
    row.count = qty;
    row.clean = clean;
    row.cleanQty = clean;
    row.cleanCount = clean;
    row.cleanUnits = clean;
    row.qtyClean = clean;
    row.repair = repair;
    row.repairQty = repair;
    row.repairCount = repair;
    row.repairUnits = repair;
    row.qtyRepair = repair;
  }

  function invisibleKeySuffix(line) {
    var n = Math.max(1, Math.min(40, lineSortValue(line) || 1));
    return new Array(n + 1).join('\u200B');
  }

  function splitBreakdownByLine(result) {
    if (!result || !Array.isArray(result.rows) || !result.rows.length) return result;
    var baseRows = result.rows;
    var serialRecords = serialRecordsFromGlobals();
    if (!serialRecords.length) serialRecords = collectFromBaseRows(baseRows);
    if (!serialRecords.length) return result;

    var baseByStation = Object.create(null);
    baseRows.forEach(function (row, idx) {
      var code = normalizeStation(row.station || row.code || '');
      if (code && !baseByStation[code]) baseByStation[code] = { row: row, idx: idx };
    });

    var groups = Object.create(null);
    serialRecords.forEach(function (record) {
      var baseInfo = baseByStation[record.station];
      if (!baseInfo) return;
      var line = record.line || UNKNOWN_LINE;
      var groupKey = record.station + '|' + line;
      if (!groups[groupKey]) {
        var clone = Object.assign({}, baseInfo.row);
        clone.no = String(baseInfo.row.no == null ? '' : baseInfo.row.no) + invisibleKeySuffix(line);
        clone.line = line;
        clone.productionLine = line;
        clone.locationKey = record.station + '|' + line;
        clone.__smtinelBaseStation = baseInfo.row.station;
        clone.__smtinelBaseNo = baseInfo.row.no;
        clone.__smtinelLineBreakdown = true;
        clone.aging = emptyAging();
        clone.serials = [];
        setCountAliases(clone, 0, 0, 0);
        groups[groupKey] = { row: clone, baseIdx: baseInfo.idx, qty: 0, clean: 0, repair: 0 };
      }
      var group = groups[groupKey];
      group.qty += 1;
      if (record.repair) group.repair += 1; else group.clean += 1;
      group.row.serials.push(record);
      var bucket = agingBucket(record.days);
      if (bucket && group.row.aging[bucket]) {
        group.row.aging[bucket].count += 1;
        group.row.aging[bucket].serials.push({ sn: record.sn, days: record.days, data: record.data });
      }
    });

    var output = [];
    baseRows.forEach(function (base, baseIdx) {
      var code = normalizeStation(base.station || base.code || '');
      var stationGroups = Object.keys(groups).map(function (key) { return groups[key]; }).filter(function (g) {
        return g.baseIdx === baseIdx;
      }).sort(function (a, b) {
        return lineSortValue(a.row.line) - lineSortValue(b.row.line) || String(a.row.line).localeCompare(String(b.row.line));
      });

      if (!stationGroups.length) {
        var fallback = Object.assign({}, base, {
          line: UNKNOWN_LINE,
          productionLine: UNKNOWN_LINE,
          locationKey: code + '|' + UNKNOWN_LINE,
          __smtinelBaseStation: base.station,
          __smtinelBaseNo: base.no,
          __smtinelLineBreakdown: true
        });
        output.push(fallback);
        return;
      }

      stationGroups.forEach(function (group) {
        setCountAliases(group.row, group.qty, group.clean, group.repair);
        output.push(group.row);
      });
    });

    var total = Number(result.total || result.totalUnits || 0) || serialRecords.length;
    output.forEach(function (row) {
      row.flowPct = total ? (Number(row.qty || 0) / total) * 100 : 0;
    });

    result.rows = output;
    result.lineAware = true;
    result.lineMapping = window.TRACEOPS_YIELD_LINE_MAPPING_META || null;
    window.__smtinelStationLineRows = output;
    scheduleTableDecoration();
    return result;
  }

  function installBreakdownWrapper() {
    var original = window.traceOpsYieldBuildStationSequenceBreakdown;
    if (typeof original !== 'function' || original[BREAKDOWN_WRAP_FLAG]) return false;

    function wrapped() {
      var result = original.apply(this, arguments);
      try { return splitBreakdownByLine(result); }
      catch (err) {
        try { console.warn('[SMTinel Yield Flow] Station + Line breakdown fallback:', err); } catch (_) {}
        return result;
      }
    }

    wrapped[BREAKDOWN_WRAP_FLAG] = true;
    wrapped.__smtinelOriginal = original;
    window.traceOpsYieldBuildStationSequenceBreakdown = wrapped;
    return true;
  }

  var decorateTimer = null;
  var decorating = false;

  function normalizeText(value) {
    return norm(value).replace(/[^A-Z0-9>–-]/g, '');
  }

  function findStationSequenceTable() {
    var tables = document.querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var headers = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) {
        return normalizeText(th.textContent);
      });
      if (headers.indexOf('NO') < 0 || headers.indexOf('STATION') < 0 || headers.indexOf('UNITS') < 0) continue;
      var node = table;
      var context = '';
      for (var depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
        context += ' ' + String(node.textContent || '').slice(0, 500);
      }
      if (/STATION SEQUENCE BREAKDOWN|SEQUENCE BREAKDOWN|DESGLOSE DE SECUENCIA/i.test(context)) return table;
    }
    return null;
  }

  function makeLineHeader(reference) {
    var th = document.createElement('th');
    th.setAttribute('data-smtinel-line-column', 'true');
    th.textContent = 'Line';
    th.style.cssText = reference && reference.getAttribute('style') ? reference.getAttribute('style') : '';
    th.style.textAlign = 'center';
    th.style.whiteSpace = 'nowrap';
    return th;
  }

  function makeLineCell(line, reference, locationKey) {
    var td = document.createElement('td');
    td.setAttribute('data-smtinel-line-column', 'true');
    td.style.cssText = reference && reference.getAttribute('style') ? reference.getAttribute('style') : '';
    td.style.textAlign = 'center';
    td.style.whiteSpace = 'nowrap';
    td.title = locationKey || line;
    var pill = document.createElement('span');
    pill.textContent = line || UNKNOWN_LINE;
    pill.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:34px;padding:3px 8px;border-radius:999px;border:1px solid #C8D8F0;background:#EEF5FF;color:#1F3A5F;font-size:10px;font-weight:900;letter-spacing:.02em';
    td.appendChild(pill);
    return td;
  }

  function decorateStationSequenceTable() {
    if (decorating || typeof document === 'undefined') return;
    decorating = true;
    try {
      var table = findStationSequenceTable();
      var rows = window.__smtinelStationLineRows || [];
      if (!table || !rows.length) return;

      var headerRow = table.querySelector('thead tr');
      if (!headerRow) return;
      var headerCells = headerRow.querySelectorAll('th');
      var stationIndex = -1;
      for (var i = 0; i < headerCells.length; i++) {
        if (normalizeText(headerCells[i].textContent) === 'STATION') { stationIndex = i; break; }
      }
      if (stationIndex < 0) return;

      var existingHeader = headerRow.querySelector('th[data-smtinel-line-column="true"]');
      if (!existingHeader) {
        var lineHeader = makeLineHeader(headerCells[stationIndex]);
        headerCells[stationIndex].insertAdjacentElement('afterend', lineHeader);
      }

      var bodyRows = table.querySelectorAll('tbody tr');
      Array.prototype.forEach.call(bodyRows, function (tr, idx) {
        var rowData = rows[idx];
        if (!rowData) return;
        var existing = tr.querySelector('td[data-smtinel-line-column="true"]');
        if (existing) {
          var pill = existing.querySelector('span');
          if (pill) pill.textContent = rowData.line || UNKNOWN_LINE;
          existing.title = rowData.locationKey || '';
          return;
        }
        var cells = tr.querySelectorAll('td');
        if (!cells[stationIndex]) return;
        var lineCell = makeLineCell(rowData.line || UNKNOWN_LINE, cells[stationIndex], rowData.locationKey);
        cells[stationIndex].insertAdjacentElement('afterend', lineCell);
        tr.setAttribute('data-smtinel-location-key', rowData.locationKey || '');
      });
      table.setAttribute('data-smtinel-line-aware', 'true');
      if (table.style && (!table.style.minWidth || parseInt(table.style.minWidth, 10) < 760)) table.style.minWidth = '760px';
    } finally {
      decorating = false;
    }
  }

  function scheduleTableDecoration() {
    if (typeof document === 'undefined') return;
    clearTimeout(decorateTimer);
    decorateTimer = setTimeout(decorateStationSequenceTable, 30);
  }

  function installObserver() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || window.__smtinelLineObserverInstalled) return;
    window.__smtinelLineObserverInstalled = true;
    var start = function () {
      if (!document.body) return;
      var observer = new MutationObserver(function () { scheduleTableDecoration(); });
      observer.observe(document.body, { childList: true, subtree: true });
      scheduleTableDecoration();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }

  function invalidateOldYieldCacheOnce() {
    try {
      if (localStorage.getItem(CACHE_MARKER) === FIX_VERSION) return;
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf('smtinel:yf:ziphash:') === 0) localStorage.removeItem(key);
      });
      localStorage.setItem(CACHE_MARKER, FIX_VERSION);
    } catch (_) {}
    try {
      if (window.indexedDB) indexedDB.deleteDatabase('SMTinelYieldFlowZipCache');
    } catch (_) {}
  }

  window.traceOpsYieldCanonicalizeLines = canonicalizeLines;
  window.traceOpsYieldSplitBreakdownByLine = splitBreakdownByLine;
  window.traceOpsYieldResolveLine = function (row) {
    var info = resolveRowLine(row || {}, { byWo: window.TRACEOPS_YIELD_LINE_BY_WO || {} }, window.TRACEOPS_YIELD_LINE_BY_SN || {});
    return info ? info.line : '';
  };

  invalidateOldYieldCacheOnce();
  installObserver();

  if (!installBuildWrapper()) {
    var buildAttempts = 0;
    var buildTimer = setInterval(function () {
      buildAttempts += 1;
      if (installBuildWrapper() || buildAttempts >= 200) clearInterval(buildTimer);
    }, 50);
  }

  if (!installBreakdownWrapper()) {
    var breakdownAttempts = 0;
    var breakdownTimer = setInterval(function () {
      breakdownAttempts += 1;
      if (installBreakdownWrapper() || breakdownAttempts >= 200) clearInterval(breakdownTimer);
    }, 50);
  }
}());
