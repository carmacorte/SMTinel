/*
 * SMTinel Board Impact ownership fix
 *
 * Keeps parent/daughter relationships as context, but resolves the effective
 * model used by Yield Flow and Board Impact from the board SKU owned by the
 * serial in SFC. This prevents daughter-board relationships from widening the
 * active model scope.
 */
(function () {
  'use strict';

  var FIX_VERSION = 'board-owner-v1';
  var CACHE_MARKER = 'smtinel:board-impact-model-fix';

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

  var SERIAL_KEYS = [
    'SERIAL', 'SERIAL NUMBER', 'SERIALNUMBER', 'SYS SERIAL NO', 'SYSSERIALNO',
    'BOXSN', 'SN', 'BARCODE'
  ];
  var WO_KEYS = ['WO', 'WORK ORDER', 'WORKORDER', 'WORK_ORDER', 'JOB'];
  var SKU_KEYS = [
    'SKU', 'SKUNO', 'SKU NO', 'SKU_NUMBER', 'MODEL NUMBER', 'MODELNUMBER',
    'ASSY PART NUMBER', 'ASSYPARTNUMBER', 'PART NUMBER', 'PARTNUMBER'
  ];
  var FAMILY_KEYS = [
    'MODEL / PRODUCT FAMILY', 'MODEL PRODUCT FAMILY', 'PRODUCT FAMILY',
    'PRODUCTFAMILY', 'FAMILY', 'CODENAME', 'MODEL NAME', 'MODELNAME', 'MODEL'
  ];

  function setExistingAliases(row, aliases, value) {
    if (!row || !value) return;
    var targets = Object.keys(row);
    var aliasSet = Object.create(null);
    aliases.forEach(function (alias) { aliasSet[normKey(alias)] = true; });
    targets.forEach(function (key) {
      if (aliasSet[normKey(key)]) row[key] = value;
    });
  }

  function findFamilyForSku(dbmodel, sku) {
    var target = norm(sku);
    if (!target) return '';
    for (var i = 0; i < dbmodel.length; i++) {
      var row = dbmodel[i] || {};
      if (norm(pick(row, SKU_KEYS)) === target) return pick(row, FAMILY_KEYS);
    }
    return '';
  }

  function buildOwnershipMaps(woRows, sfcRows, dbmodelRows) {
    var byWo = Object.create(null);
    var bySerial = Object.create(null);

    (woRows || []).forEach(function (row) {
      var wo = norm(pick(row, WO_KEYS));
      var sku = pick(row, SKU_KEYS);
      var family = pick(row, FAMILY_KEYS) || findFamilyForSku(dbmodelRows || [], sku);
      if (wo && sku) byWo[wo] = { sku: sku, family: family, source: 'WO' };
    });

    (sfcRows || []).forEach(function (row) {
      var serial = norm(pick(row, SERIAL_KEYS));
      var wo = norm(pick(row, WO_KEYS));
      var sku = pick(row, SKU_KEYS);
      var family = pick(row, FAMILY_KEYS);
      var woOwner = wo ? byWo[wo] : null;

      if (!sku && woOwner) sku = woOwner.sku;
      if (!family && sku) family = findFamilyForSku(dbmodelRows || [], sku);
      if (!family && woOwner) family = woOwner.family;

      if (serial && sku) {
        bySerial[serial] = {
          sku: sku,
          family: family,
          wo: wo,
          source: 'SFC'
        };
      }
    });

    return { byWo: byWo, bySerial: bySerial };
  }

  function annotateOwner(row, owner) {
    if (!row || !owner || !owner.sku) return row;

    var originalSku = pick(row, SKU_KEYS);
    var originalFamily = pick(row, FAMILY_KEYS);

    row.__smtinelBoardSku = owner.sku;
    row.__smtinelBoardModel = owner.family || '';
    row.__smtinelModelSource = owner.source || 'SFC';

    if (originalSku && norm(originalSku) !== norm(owner.sku)) {
      row.__smtinelRelatedSku = originalSku;
    }
    if (originalFamily && owner.family && norm(originalFamily) !== norm(owner.family)) {
      row.__smtinelRelatedModel = originalFamily;
      row.__smtinelRelationshipType = 'RELATED_BOARD';
    }

    setExistingAliases(row, SKU_KEYS, owner.sku);
    if (owner.family) setExistingAliases(row, FAMILY_KEYS, owner.family);

    row['SMTinel Board SKU'] = owner.sku;
    row['SMTinel Board Model'] = owner.family || '';
    row['SMTinel Model Source'] = owner.source || 'SFC';

    return row;
  }

  function canonicalize(woRows, sfcRows, repairRows, dbmodelRows) {
    woRows = woRows || [];
    sfcRows = sfcRows || [];
    repairRows = repairRows || [];
    dbmodelRows = dbmodelRows || [];

    var maps = buildOwnershipMaps(woRows, sfcRows, dbmodelRows);

    sfcRows.forEach(function (row) {
      var serial = norm(pick(row, SERIAL_KEYS));
      var wo = norm(pick(row, WO_KEYS));
      var owner = (serial && maps.bySerial[serial]) || (wo && maps.byWo[wo]);
      annotateOwner(row, owner);
    });

    repairRows.forEach(function (row) {
      var serial = norm(pick(row, SERIAL_KEYS));
      var wo = norm(pick(row, WO_KEYS));
      var owner = (serial && maps.bySerial[serial]) || (wo && maps.byWo[wo]);
      annotateOwner(row, owner);
    });

    return {
      wo: woRows,
      sfc: sfcRows,
      repair: repairRows,
      ownership: maps
    };
  }

  function installBuildWrapper() {
    var original = window.traceOpsYieldBuildFromImported;
    if (typeof original !== 'function' || original.__smtinelBoardOwnershipWrapped) return false;

    function wrapped(woRows, sfcRows, repairRows, meta, calendarRows, dbmodelRows, cesiumRows, bomRows) {
      var fixed = canonicalize(woRows, sfcRows, repairRows, dbmodelRows);
      var result = original.call(
        this,
        fixed.wo,
        fixed.sfc,
        fixed.repair,
        meta,
        calendarRows,
        dbmodelRows,
        cesiumRows,
        bomRows
      );

      if (result && typeof result === 'object') {
        result.boardModelOwnership = {
          version: FIX_VERSION,
          rule: 'SERIAL_SFC_SKU_FIRST',
          relatedBoardsAreContextOnly: true
        };
      }
      return result;
    }

    wrapped.__smtinelBoardOwnershipWrapped = true;
    wrapped.__smtinelOriginal = original;
    window.traceOpsYieldBuildFromImported = wrapped;
    return true;
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

  invalidateOldYieldCacheOnce();

  if (!installBuildWrapper()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (installBuildWrapper() || attempts >= 100) clearInterval(timer);
    }, 50);
  }

  window.traceOpsCanonicalizeBoardOwnership = canonicalize;
}());
