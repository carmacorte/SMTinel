/*
 * SMTinel Board Impact ownership fix
 *
 * Resolves the effective board model from the board serial and SKU owned by SFC.
 * Parent/chassis serials and daughter-board relationships remain context only and
 * never widen or replace the active Board Impact model scope.
 */
(function () {
  'use strict';

  var FIX_VERSION = 'board-owner-v2';
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

  /*
   * Important: BOXSN is intentionally excluded from BOARD_SERIAL_KEYS.
   * SFC exports contain both SN and boxsn. BOXSN identifies the parent/chassis
   * and can be shared by several boards, so using it as the ownership key mixes
   * mainboards and daughter boards.
   */
  var BOARD_SERIAL_KEYS = [
    'SN', 'SYS SERIAL NO', 'SYSSERIALNO', 'SERIAL', 'SERIAL NUMBER',
    'SERIALNUMBER', 'BARCODE'
  ];
  var PARENT_SERIAL_KEYS = [
    'BOXSN', 'BOX SN', 'PARENT SERIAL NO', 'PARENT SERIAL NUMBER',
    'PARENTSERIALNO', 'PARENTSERIALNUMBER'
  ];
  var WO_KEYS = ['WO', 'WORK ORDER', 'WORKORDER', 'WORK_ORDER', 'WORKORDERNO', 'JOB'];

  var ROW_SKU_KEYS = [
    'SKU', 'SKUNO', 'SKU NO', 'SKU_NUMBER', 'P_NO', 'P NO',
    'MODEL NUMBER', 'MODELNUMBER', 'ASSY PART NUMBER', 'ASSYPARTNUMBER',
    'PART NUMBER', 'PARTNUMBER'
  ];
  var DBMODEL_SKU_KEYS = [
    'MODEL', 'SKU', 'SKUNO', 'SKU NO', 'P_NO', 'P NO',
    'MODEL NUMBER', 'MODELNUMBER', 'PART NUMBER', 'PARTNUMBER'
  ];
  var FAMILY_KEYS = [
    'MODEL / PRODUCT FAMILY', 'MODEL PRODUCT FAMILY', 'PRODUCT FAMILY',
    'PRODCUT FAMILY', 'PRODUCTFAMILY', 'PRODCUTFAMILY', 'FAMILY',
    'CODENAME', 'MODEL NAME', 'MODELNAME'
  ];
  var DBMODEL_FAMILY_KEYS = [
    'CODENAME', 'PRODUCT FAMILY', 'PRODCUT FAMILY', 'PRODUCTFAMILY',
    'PRODCUTFAMILY', 'FAMILY', 'MODEL NAME', 'MODELNAME'
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

  function buildDbModelIndex(dbmodelRows) {
    var bySku = Object.create(null);
    (dbmodelRows || []).forEach(function (row) {
      var sku = norm(pick(row, DBMODEL_SKU_KEYS));
      var family = pick(row, DBMODEL_FAMILY_KEYS);
      if (sku && family) bySku[sku] = family;
    });
    return bySku;
  }

  function buildOwnershipMaps(woRows, sfcRows, dbmodelRows) {
    var byWo = Object.create(null);
    var bySerial = Object.create(null);
    var parentSerials = Object.create(null);
    var familyBySku = buildDbModelIndex(dbmodelRows || []);

    (woRows || []).forEach(function (row) {
      var wo = norm(pick(row, WO_KEYS));
      var sku = pick(row, ROW_SKU_KEYS);
      var family = pick(row, FAMILY_KEYS) || familyBySku[norm(sku)] || '';
      if (wo && sku) byWo[wo] = { sku: sku, family: family, source: 'WO' };
    });

    (sfcRows || []).forEach(function (row) {
      var serial = norm(pick(row, BOARD_SERIAL_KEYS));
      var parentSerial = norm(pick(row, PARENT_SERIAL_KEYS));
      var wo = norm(pick(row, WO_KEYS));
      var sku = pick(row, ROW_SKU_KEYS);
      var family = pick(row, FAMILY_KEYS);
      var woOwner = wo ? byWo[wo] : null;

      if (!sku && woOwner) sku = woOwner.sku;
      if (!family && sku) family = familyBySku[norm(sku)] || '';
      if (!family && woOwner) family = woOwner.family;

      if (serial && sku) {
        bySerial[serial] = {
          sku: sku,
          family: family,
          wo: wo,
          parentSerial: parentSerial,
          source: 'SFC_SN'
        };
      }

      if (parentSerial && serial) {
        if (!parentSerials[parentSerial]) parentSerials[parentSerial] = [];
        parentSerials[parentSerial].push(serial);
      }
    });

    return {
      byWo: byWo,
      bySerial: bySerial,
      parentSerials: parentSerials,
      familyBySku: familyBySku
    };
  }

  function annotateOwner(row, owner) {
    if (!row || !owner || !owner.sku) return row;

    var originalSku = pick(row, ROW_SKU_KEYS);
    var originalFamily = pick(row, FAMILY_KEYS);

    row.__smtinelBoardSku = owner.sku;
    row.__smtinelBoardModel = owner.family || '';
    row.__smtinelModelSource = owner.source || 'SFC_SN';
    if (owner.parentSerial) row.__smtinelParentSerial = owner.parentSerial;

    if (originalSku && norm(originalSku) !== norm(owner.sku)) {
      row.__smtinelRelatedSku = originalSku;
    }
    if (originalFamily && owner.family && norm(originalFamily) !== norm(owner.family)) {
      row.__smtinelRelatedModel = originalFamily;
      row.__smtinelRelationshipType = 'RELATED_BOARD';
    }

    setExistingAliases(row, ROW_SKU_KEYS, owner.sku);
    if (owner.family) setExistingAliases(row, FAMILY_KEYS, owner.family);

    row['SMTinel Board SKU'] = owner.sku;
    row['SMTinel Board Model'] = owner.family || '';
    row['SMTinel Model Source'] = owner.source || 'SFC_SN';

    return row;
  }

  function canonicalize(woRows, sfcRows, repairRows, dbmodelRows) {
    woRows = woRows || [];
    sfcRows = sfcRows || [];
    repairRows = repairRows || [];
    dbmodelRows = dbmodelRows || [];

    var maps = buildOwnershipMaps(woRows, sfcRows, dbmodelRows);

    sfcRows.forEach(function (row) {
      var serial = norm(pick(row, BOARD_SERIAL_KEYS));
      var wo = norm(pick(row, WO_KEYS));
      var owner = (serial && maps.bySerial[serial]) || (wo && maps.byWo[wo]);
      annotateOwner(row, owner);
    });

    repairRows.forEach(function (row) {
      var serial = norm(pick(row, BOARD_SERIAL_KEYS));
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
          rule: 'BOARD_SN_TO_SFC_SKU_THEN_DBMODEL',
          boardSerialExcludesBoxSn: true,
          dbModelSchema: 'MODEL_TO_CODENAME',
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

  function keepWrapperInstalled() {
    installBuildWrapper();
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      installBuildWrapper();
      if (attempts >= 600) clearInterval(timer);
    }, 250);

    if (document && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', installBuildWrapper, { once: true });
      window.addEventListener('load', installBuildWrapper, { once: true });
    }
  }

  invalidateOldYieldCacheOnce();
  keepWrapperInstalled();

  window.traceOpsCanonicalizeBoardOwnership = canonicalize;
  window.traceOpsBoardOwnershipDiagnostics = {
    version: FIX_VERSION,
    boardSerialRule: 'SN_FIRST_BOXSN_CONTEXT_ONLY',
    dbModelSchema: 'MODEL_TO_CODENAME',
    woSchema: 'WO_P_NO_PRODCUT_FAMILY_SUPPORTED'
  };
}());
