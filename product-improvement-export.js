/* SMTinel Product Improvement Report export
 * Builds a weighted before/after product report from the active Yield Flow model.
 * The report is calculated only on click so ZIP import and rendering stay lightweight.
 */
(function () {
  'use strict';

  var VERSION = 'product-improvement-v1';
  var BUTTON_ID = 'smtinel-product-improvement-export';
  var MIN_VOLUME = 20;

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function number(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function pct(value) {
    return Math.round(number(value) * 100) / 100;
  }

  function normalizeWo(value) {
    var raw = text(value);
    return raw.replace(/^0+/, '') || raw;
  }

  function unique(values) {
    var seen = Object.create(null);
    return (values || []).filter(function (value) {
      var key = text(value);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function weekSortValue(value) {
    var raw = text(value).toUpperCase();
    var match = raw.match(/FY\s*(\d{4}).*?Q\s*(\d).*?W-?0*(\d+)/i);
    if (match) return Number(match[1]) * 1000 + Number(match[2]) * 100 + Number(match[3]);
    match = raw.match(/Q\s*(\d).*?W-?0*(\d+)/i);
    if (match) return Number(match[1]) * 100 + Number(match[2]);
    match = raw.match(/W-?0*(\d+)/i);
    if (match) return Number(match[1]);
    return 0;
  }

  function sortWeeks(values) {
    return unique(values).sort(function (a, b) {
      return weekSortValue(a) - weekSortValue(b) || text(a).localeCompare(text(b));
    });
  }

  function severityLabel(deltaYield, deltaOjt, currentOjt) {
    if (deltaYield <= -8 || deltaOjt <= -8 || currentOjt >= 25) return 'Critical';
    if (deltaYield <= -4 || deltaOjt <= -4 || currentOjt >= 15) return 'High';
    if (deltaYield < -2 || deltaOjt < -2 || currentOjt >= 8) return 'Medium';
    return 'Low';
  }

  function rowDefect(row) {
    return text(
      row.topSymptom || row.symptom || row.cause || row.failureMode || row.failure ||
      row.testInfo || row.failingTestName || row.repairCause || row.repairSymptom || 'N/D'
    ) || 'N/D';
  }

  function rowUnits(row) {
    return Math.max(0, number(row.total || row.units || row.qty || row.woQty));
  }

  function rowRisk(row) {
    return Math.max(0, number(row.risk || row.fail || row.failed || row.touchUnits));
  }

  function rowClean(row) {
    var units = rowUnits(row);
    var explicit = number(row.clean);
    if (explicit > 0 || units === 0) return Math.max(0, Math.min(units || explicit, explicit));
    return Math.max(0, units - rowRisk(row));
  }

  function getContext() {
    var ctx = window.TRACEOPS_YIELD_PRODUCT_EXPORT_CONTEXT || {};
    var model = ctx.model || window.TRACEOPS_YIELD_CURRENT_MODEL || null;
    var filters = ctx.filters || window.TRACEOPS_YIELD_CURRENT_FILTERS || {};
    var focusRange = ctx.focusRange || window.TRACEOPS_YIELD_FOCUS_RANGE || {};
    if (!model || !Array.isArray(model.rows)) {
      throw new Error('No Yield Flow model is available. Load the Yield Flow ZIP and open Yield Flow first.');
    }
    return { model: model, filters: filters || {}, focusRange: focusRange || {} };
  }

  function chooseRanges(rows, focusRange) {
    var weeks = sortWeeks((rows || []).map(function (row) { return row.week; }).filter(Boolean));
    var selected = weeks.slice();
    var start = text(focusRange && focusRange.start);
    var end = text(focusRange && focusRange.end);
    if (start && end) {
      var startIndex = weeks.indexOf(start);
      var endIndex = weeks.indexOf(end);
      if (startIndex >= 0 && endIndex >= 0) {
        selected = weeks.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
      }
    }

    var baseline = [];
    var current = [];
    if (selected.length >= 4) {
      var split = Math.floor(selected.length / 2);
      baseline = selected.slice(0, split);
      current = selected.slice(split);
    } else if (selected.length === 3) {
      baseline = selected.slice(0, 1);
      current = selected.slice(1);
    } else if (selected.length === 2) {
      baseline = selected.slice(0, 1);
      current = selected.slice(1);
    } else if (selected.length === 1) {
      current = selected.slice();
    }

    return {
      allWeeks: weeks,
      selectedWeeks: selected,
      baselineWeeks: baseline,
      currentWeeks: current,
      baselineLabel: baseline.length ? baseline[0] + ' - ' + baseline[baseline.length - 1] : 'N/D',
      currentLabel: current.length ? current[0] + ' - ' + current[current.length - 1] : 'N/D'
    };
  }

  function periodForWeek(week, ranges) {
    if (ranges.baselineWeeks.indexOf(week) >= 0) return 'Baseline';
    if (ranges.currentWeeks.indexOf(week) >= 0) return 'Current';
    return 'Outside';
  }

  function productKey(row) {
    return [text(row.family || row.productFamily || row.model || 'N/D'), text(row.sku || row.skuno || 'N/D')].join('||');
  }

  function emptyAggregate(row) {
    return {
      family: text(row.family || row.productFamily || row.model || 'N/D') || 'N/D',
      sku: text(row.sku || row.skuno || 'N/D') || 'N/D',
      units: 0,
      clean: 0,
      risk: 0,
      weeks: Object.create(null),
      workOrders: Object.create(null),
      lines: Object.create(null),
      defects: Object.create(null),
      rows: []
    };
  }

  function addToAggregate(aggregate, row) {
    var units = rowUnits(row);
    var risk = Math.min(units || rowRisk(row), rowRisk(row));
    var clean = units ? Math.max(0, units - risk) : rowClean(row);
    aggregate.units += units;
    aggregate.risk += risk;
    aggregate.clean += clean;
    aggregate.rows.push(row);
    if (text(row.week)) aggregate.weeks[text(row.week)] = true;
    if (text(row.wo || row.workOrder)) aggregate.workOrders[normalizeWo(row.wo || row.workOrder)] = true;
    if (text(row.line)) aggregate.lines[text(row.line)] = true;
    var defect = rowDefect(row);
    aggregate.defects[defect] = (aggregate.defects[defect] || 0) + Math.max(1, risk || 0);
  }

  function finishAggregate(aggregate) {
    var topDefect = Object.keys(aggregate.defects).sort(function (a, b) {
      return aggregate.defects[b] - aggregate.defects[a] || a.localeCompare(b);
    })[0] || 'N/D';
    return {
      family: aggregate.family,
      sku: aggregate.sku,
      units: aggregate.units,
      clean: aggregate.clean,
      risk: aggregate.risk,
      yield: aggregate.units ? aggregate.clean / aggregate.units * 100 : 0,
      ojt: aggregate.units ? aggregate.risk / aggregate.units * 100 : 0,
      weeks: Object.keys(aggregate.weeks),
      weekCount: Object.keys(aggregate.weeks).length,
      workOrders: Object.keys(aggregate.workOrders),
      woCount: Object.keys(aggregate.workOrders).length,
      lines: Object.keys(aggregate.lines),
      topDefect: topDefect,
      topDefectCount: aggregate.defects[topDefect] || 0,
      defects: aggregate.defects,
      rows: aggregate.rows
    };
  }

  function aggregatePeriod(rows) {
    var map = Object.create(null);
    (rows || []).forEach(function (row) {
      var key = productKey(row);
      if (!map[key]) map[key] = emptyAggregate(row);
      addToAggregate(map[key], row);
    });
    Object.keys(map).forEach(function (key) { map[key] = finishAggregate(map[key]); });
    return map;
  }

  function aggregateWeekly(rows, ranges) {
    var map = Object.create(null);
    (rows || []).forEach(function (row) {
      var period = periodForWeek(text(row.week), ranges);
      if (period === 'Outside') return;
      var key = productKey(row) + '||' + text(row.week);
      if (!map[key]) map[key] = emptyAggregate(row);
      addToAggregate(map[key], row);
    });
    return Object.keys(map).map(function (key) {
      var aggregate = finishAggregate(map[key]);
      aggregate.week = text(map[key].rows[0] && map[key].rows[0].week);
      aggregate.period = periodForWeek(aggregate.week, ranges);
      return aggregate;
    }).sort(function (a, b) {
      return a.family.localeCompare(b.family) || a.sku.localeCompare(b.sku) || weekSortValue(a.week) - weekSortValue(b.week);
    });
  }

  function consecutiveImprovedWeeks(weeklyRows, family, sku, baselineYield, baselineOjt) {
    var rows = weeklyRows.filter(function (row) {
      return row.period === 'Current' && row.family === family && row.sku === sku;
    }).sort(function (a, b) { return weekSortValue(a.week) - weekSortValue(b.week); });
    var count = 0;
    rows.forEach(function (row) {
      if (row.yield >= baselineYield + 2 && row.ojt <= baselineOjt - 2) count += 1;
      else count = 0;
    });
    return count;
  }

  function confidence(baseline, current) {
    if (!baseline || !current || !baseline.units || !current.units) return 'Low';
    if (baseline.units >= 100 && current.units >= 100 && baseline.weekCount >= 2 && current.weekCount >= 2) return 'High';
    if (baseline.units >= 30 && current.units >= 30) return 'Medium';
    return 'Low';
  }

  function classify(baseline, current, sustainedWeeks) {
    if (!current || !current.units) return 'No current data';
    if (!baseline || !baseline.units) return 'New product';
    if (baseline.units < MIN_VOLUME || current.units < MIN_VOLUME) return 'Insufficient volume';
    var deltaYield = current.yield - baseline.yield;
    var riskReduction = baseline.ojt - current.ojt;
    if (sustainedWeeks >= 3 && deltaYield > 2 && riskReduction > 0) return 'Sustained';
    if (deltaYield >= 5 && riskReduction > 0) return 'Improving';
    if (deltaYield <= -2 || riskReduction <= -2) return 'Deteriorating';
    if (Math.abs(deltaYield) <= 2 && Math.abs(riskReduction) <= 2) return 'Stable';
    return deltaYield > 0 ? 'Improving' : 'Stable';
  }

  function buildReportData(context) {
    var model = context.model;
    var ranges = chooseRanges(model.rows || [], context.focusRange || {});
    var selectedRows = (model.rows || []).filter(function (row) {
      return ranges.selectedWeeks.indexOf(text(row.week)) >= 0;
    });
    var baselineRows = selectedRows.filter(function (row) { return ranges.baselineWeeks.indexOf(text(row.week)) >= 0; });
    var currentRows = selectedRows.filter(function (row) { return ranges.currentWeeks.indexOf(text(row.week)) >= 0; });
    var baselineMap = aggregatePeriod(baselineRows);
    var currentMap = aggregatePeriod(currentRows);
    var weekly = aggregateWeekly(selectedRows, ranges);
    var keys = unique(Object.keys(baselineMap).concat(Object.keys(currentMap)));

    var products = keys.map(function (key) {
      var baseline = baselineMap[key] || null;
      var current = currentMap[key] || null;
      var family = (current && current.family) || (baseline && baseline.family) || 'N/D';
      var sku = (current && current.sku) || (baseline && baseline.sku) || 'N/D';
      var sustainedWeeks = baseline ? consecutiveImprovedWeeks(weekly, family, sku, baseline.yield, baseline.ojt) : 0;
      var status = classify(baseline, current, sustainedWeeks);
      var baselineYield = baseline ? baseline.yield : 0;
      var currentYield = current ? current.yield : 0;
      var baselineOjt = baseline ? baseline.ojt : 0;
      var currentOjt = current ? current.ojt : 0;
      var deltaYield = currentYield - baselineYield;
      var riskReduction = baselineOjt - currentOjt;
      var expectedRisk = baseline && current ? current.units * baselineOjt / 100 : 0;
      var avoided = current ? Math.max(0, Math.round(expectedRisk - current.risk)) : 0;
      return {
        Status: status,
        Severity: severityLabel(deltaYield, riskReduction, currentOjt),
        'Product Family': family,
        SKU: sku,
        'Baseline Period': ranges.baselineLabel,
        'Current Period': ranges.currentLabel,
        'Baseline Units': baseline ? baseline.units : 0,
        'Current Units': current ? current.units : 0,
        'Baseline Yield %': pct(baselineYield),
        'Current Yield %': pct(currentYield),
        'Yield Delta pts': pct(deltaYield),
        'Baseline OJT %': pct(baselineOjt),
        'Current OJT %': pct(currentOjt),
        'Risk Reduction pts': pct(riskReduction),
        'Baseline Risk SN': baseline ? baseline.risk : 0,
        'Current Risk SN': current ? current.risk : 0,
        'Risk SN Avoided': avoided,
        'Improved Weeks': sustainedWeeks,
        'Baseline WO': baseline ? baseline.woCount : 0,
        'Current WO': current ? current.woCount : 0,
        Lines: unique((baseline ? baseline.lines : []).concat(current ? current.lines : [])).join(', '),
        Confidence: confidence(baseline, current),
        'Top Previous Defect': baseline ? baseline.topDefect : 'N/D',
        'Top Current Defect': current ? current.topDefect : 'N/D'
      };
    }).sort(function (a, b) {
      var rank = { Sustained: 1, Improving: 2, Stable: 3, 'Insufficient volume': 4, 'New product': 5, Deteriorating: 6, 'No current data': 7 };
      return (rank[a.Status] || 99) - (rank[b.Status] || 99) || b['Yield Delta pts'] - a['Yield Delta pts'];
    });

    var allBaseline = finishAggregate((function () {
      var aggregate = emptyAggregate({ family: 'ALL', sku: 'ALL' });
      baselineRows.forEach(function (row) { addToAggregate(aggregate, row); });
      return aggregate;
    }()));
    var allCurrent = finishAggregate((function () {
      var aggregate = emptyAggregate({ family: 'ALL', sku: 'ALL' });
      currentRows.forEach(function (row) { addToAggregate(aggregate, row); });
      return aggregate;
    }()));

    return {
      ranges: ranges,
      selectedRows: selectedRows,
      weekly: weekly,
      products: products,
      baselineTotal: allBaseline,
      currentTotal: allCurrent,
      filters: context.filters || {},
      model: model
    };
  }

  function addRowsSheet(workbook, name, headers, rows, options) {
    options = options || {};
    var sheet = workbook.addWorksheet(name);
    if (options.title) {
      sheet.addRow([options.title]);
      sheet.mergeCells(1, 1, 1, Math.max(1, headers.length));
      sheet.getRow(1).height = 28;
      sheet.getCell(1, 1).font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF102A43' } };
    }
    if (options.subtitle) {
      sheet.addRow([options.subtitle]);
      sheet.mergeCells(2, 1, 2, Math.max(1, headers.length));
      sheet.getCell(2, 1).font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF5F766C' } };
    }
    var headerRowNumber = sheet.rowCount + 1;
    sheet.addRow(headers);
    var headerRow = sheet.getRow(headerRowNumber);
    headerRow.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    (rows || []).forEach(function (row) {
      sheet.addRow(headers.map(function (header) { return row[header] == null ? '' : row[header]; }));
    });
    sheet.columns = headers.map(function (header) {
      return { key: header, width: Math.max(12, Math.min(34, text(header).length + 8)) };
    });
    sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
    if (rows && rows.length) {
      sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber + rows.length, column: headers.length } };
    }
    for (var rowIndex = headerRowNumber + 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
      if ((rowIndex - headerRowNumber) % 2 === 0) {
        sheet.getRow(rowIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FAFF' } };
      }
    }
    return sheet;
  }

  function buildWorkbook(data) {
    var workbook = new ExcelJS.Workbook();
    workbook.creator = 'SMTinel Product Improvement';
    workbook.created = new Date();
    workbook.modified = new Date();

    var improving = data.products.filter(function (row) { return row.Status === 'Improving' || row.Status === 'Sustained'; });
    var sustained = data.products.filter(function (row) { return row.Status === 'Sustained'; });
    var deteriorating = data.products.filter(function (row) { return row.Status === 'Deteriorating'; });
    var baselineYield = data.baselineTotal.yield || 0;
    var currentYield = data.currentTotal.yield || 0;
    var summary = [
      { Metric: 'Report Version', Value: VERSION },
      { Metric: 'Baseline Range', Value: data.ranges.baselineLabel },
      { Metric: 'Current Range', Value: data.ranges.currentLabel },
      { Metric: 'Products Improving', Value: improving.length },
      { Metric: 'Products Sustained', Value: sustained.length },
      { Metric: 'Products Deteriorating', Value: deteriorating.length },
      { Metric: 'Baseline Weighted Yield %', Value: pct(baselineYield) },
      { Metric: 'Current Weighted Yield %', Value: pct(currentYield) },
      { Metric: 'Weighted Yield Gain pts', Value: pct(currentYield - baselineYield) },
      { Metric: 'Baseline OJT %', Value: pct(data.baselineTotal.ojt || 0) },
      { Metric: 'Current OJT %', Value: pct(data.currentTotal.ojt || 0) },
      { Metric: 'Risk SN Avoided', Value: data.products.reduce(function (sum, row) { return sum + number(row['Risk SN Avoided']); }, 0) },
      { Metric: 'Minimum Volume Rule', Value: MIN_VOLUME },
      { Metric: 'Scope BU', Value: data.filters.bu || 'ALL' },
      { Metric: 'Scope Product Family', Value: data.filters.family || 'ALL' },
      { Metric: 'Scope SKU', Value: data.filters.sku || 'ALL' },
      { Metric: 'Scope Line', Value: data.filters.line || 'ALL' },
      { Metric: 'Generated', Value: new Date().toLocaleString() }
    ];
    addRowsSheet(workbook, 'Executive Summary', ['Metric', 'Value'], summary, {
      title: 'SMTinel Product Improvement Report',
      subtitle: 'Weighted before/after comparison using Yield Flow work-order data.'
    });

    var productHeaders = [
      'Status', 'Severity', 'Product Family', 'SKU', 'Baseline Period', 'Current Period',
      'Baseline Units', 'Current Units', 'Baseline Yield %', 'Current Yield %', 'Yield Delta pts',
      'Baseline OJT %', 'Current OJT %', 'Risk Reduction pts', 'Baseline Risk SN', 'Current Risk SN',
      'Risk SN Avoided', 'Improved Weeks', 'Baseline WO', 'Current WO', 'Lines', 'Confidence',
      'Top Previous Defect', 'Top Current Defect'
    ];
    addRowsSheet(workbook, 'Product Improvement', productHeaders, data.products, {
      title: 'Product Improvement',
      subtitle: data.ranges.baselineLabel + ' vs ' + data.ranges.currentLabel
    });

    var weeklyRows = data.weekly.map(function (row) {
      return {
        Period: row.period,
        Week: row.week,
        'Product Family': row.family,
        SKU: row.sku,
        Units: row.units,
        Clean: row.clean,
        Risk: row.risk,
        'Yield %': pct(row.yield),
        'OJT %': pct(row.ojt),
        WO: row.woCount,
        Lines: row.lines.join(', '),
        'Top Defect': row.topDefect
      };
    });
    addRowsSheet(workbook, 'Weekly Trend', ['Period', 'Week', 'Product Family', 'SKU', 'Units', 'Clean', 'Risk', 'Yield %', 'OJT %', 'WO', 'Lines', 'Top Defect'], weeklyRows, {
      title: 'Weekly Product Trend',
      subtitle: 'One weighted row per product and Cisco week.'
    });

    var woRows = data.selectedRows.map(function (row) {
      var period = periodForWeek(text(row.week), data.ranges);
      var units = rowUnits(row);
      var risk = rowRisk(row);
      return {
        Period: period,
        Week: row.week || '',
        Line: row.line || '',
        BU: row.bu || row.buLabel || '',
        'Product Family': row.family || '',
        SKU: row.sku || '',
        WO: normalizeWo(row.wo || row.workOrder),
        Units: units,
        Clean: Math.max(0, units - risk),
        Risk: risk,
        'Yield %': pct(units ? (units - risk) / units * 100 : row.yield),
        'OJT %': pct(units ? risk / units * 100 : row.touch),
        Defect: rowDefect(row)
      };
    }).sort(function (a, b) { return weekSortValue(a.Week) - weekSortValue(b.Week) || a['Product Family'].localeCompare(b['Product Family']); });
    addRowsSheet(workbook, 'WO Detail', ['Period', 'Week', 'Line', 'BU', 'Product Family', 'SKU', 'WO', 'Units', 'Clean', 'Risk', 'Yield %', 'OJT %', 'Defect'], woRows, {
      title: 'Work Order Evidence',
      subtitle: 'Underlying work orders used for the weighted comparison.'
    });

    var defectRows = data.products.map(function (row) {
      return {
        Status: row.Status,
        'Product Family': row['Product Family'],
        SKU: row.SKU,
        'Previous Defect': row['Top Previous Defect'],
        'Current Defect': row['Top Current Defect'],
        'Baseline Risk SN': row['Baseline Risk SN'],
        'Current Risk SN': row['Current Risk SN'],
        'Risk Reduction pts': row['Risk Reduction pts'],
        'Risk SN Avoided': row['Risk SN Avoided']
      };
    });
    addRowsSheet(workbook, 'Before vs After Defects', ['Status', 'Product Family', 'SKU', 'Previous Defect', 'Current Defect', 'Baseline Risk SN', 'Current Risk SN', 'Risk Reduction pts', 'Risk SN Avoided'], defectRows, {
      title: 'Before vs After Defects',
      subtitle: 'Dominant symptom and risk change by product.'
    });

    var actions = (data.model.actionTracker || window.TRACEOPS_YIELD_ACTION_LIST || []).map(function (action) {
      return {
        'Action ID': action.id || action.rccaId || '',
        Source: action.source || '',
        Product: action.model || action.family || action.focus || '',
        SKU: action.sku || '',
        WO: action.workOrder || action.wo || '',
        'Failure Mode': action.failureMode || action.context || '',
        Action: action.action || action.actionType || '',
        Owner: action.owner || '',
        Status: action.status || '',
        'Due Date': action.dueDate || '',
        Comments: action.comments || ''
      };
    });
    addRowsSheet(workbook, 'RCCA Effectiveness', ['Action ID', 'Source', 'Product', 'SKU', 'WO', 'Failure Mode', 'Action', 'Owner', 'Status', 'Due Date', 'Comments'], actions, {
      title: 'RCCA Effectiveness Linkage',
      subtitle: 'Actions available in the active Yield Flow context.'
    });

    addRowsSheet(workbook, 'Products Deteriorating', productHeaders, deteriorating, {
      title: 'Products Deteriorating',
      subtitle: 'Products with lower weighted yield or higher OJT in the current period.'
    });

    var missingFamily = data.selectedRows.filter(function (row) { return !text(row.family) || text(row.family) === 'N/D'; }).length;
    var missingSku = data.selectedRows.filter(function (row) { return !text(row.sku) || text(row.sku) === 'N/D'; }).length;
    var quality = [
      { Check: 'Selected WO rows', Value: data.selectedRows.length, Status: data.selectedRows.length ? 'OK' : 'FAIL' },
      { Check: 'Selected weeks', Value: data.ranges.selectedWeeks.length, Status: data.ranges.selectedWeeks.length >= 2 ? 'OK' : 'REVIEW' },
      { Check: 'Baseline weeks', Value: data.ranges.baselineWeeks.length, Status: data.ranges.baselineWeeks.length ? 'OK' : 'REVIEW' },
      { Check: 'Current weeks', Value: data.ranges.currentWeeks.length, Status: data.ranges.currentWeeks.length ? 'OK' : 'REVIEW' },
      { Check: 'Products evaluated', Value: data.products.length, Status: data.products.length ? 'OK' : 'FAIL' },
      { Check: 'Missing family rows', Value: missingFamily, Status: missingFamily ? 'REVIEW' : 'OK' },
      { Check: 'Missing SKU rows', Value: missingSku, Status: missingSku ? 'REVIEW' : 'OK' },
      { Check: 'Insufficient volume products', Value: data.products.filter(function (row) { return row.Status === 'Insufficient volume'; }).length, Status: 'INFO' },
      { Check: 'Algorithm', Value: 'Weighted clean / total; risk = impacted SN; automatic range split', Status: VERSION }
    ];
    addRowsSheet(workbook, 'Data Quality', ['Check', 'Value', 'Status'], quality, {
      title: 'Data Quality and Method',
      subtitle: 'Validation details for the generated report.'
    });

    return workbook;
  }

  async function exportReport() {
    try {
      var button = document.getElementById(BUTTON_ID);
      if (button) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Building report...';
      }
      if (typeof window.ensureExcelTools === 'function') await window.ensureExcelTools();
      if (!window.ExcelJS) throw new Error('ExcelJS is not available.');
      var context = getContext();
      var data = buildReportData(context);
      if (!data.selectedRows.length) throw new Error('No Yield Flow work orders are available in the active range.');
      var workbook = buildWorkbook(data);
      var buffer = await workbook.xlsx.writeBuffer();
      var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'SMTinel_Product_Improvement_Report_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        try { URL.revokeObjectURL(link.href); } catch (_) {}
        link.remove();
      }, 1500);
    } catch (error) {
      console.error('[SMTinel Product Improvement Export]', error);
      alert('Product Improvement export: ' + (error && error.message ? error.message : error));
    } finally {
      var button = document.getElementById(BUTTON_ID);
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Export Product Improvement XLSX';
      }
    }
  }

  function makeButton() {
    var button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Export Product Improvement XLSX';
    button.title = 'Compare the active Yield Flow range and export weighted product improvement results.';
    button.style.cssText = [
      'border:1px solid #C9DAF5',
      'background:linear-gradient(135deg,#1F3A5F,#2F6FB3)',
      'color:#fff',
      'border-radius:999px',
      'padding:9px 14px',
      'font-size:10px',
      'font-weight:900',
      'cursor:pointer',
      'white-space:nowrap',
      'box-shadow:0 6px 16px rgba(31,58,95,.16)'
    ].join(';');
    button.addEventListener('click', exportReport);
    return button;
  }

  function findTopbarAnchor() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
    return buttons.find(function (button) {
      return /Export Executive PPTX/i.test(text(button.textContent));
    }) || buttons.find(function (button) {
      return /Download XLSX log/i.test(text(button.textContent));
    }) || null;
  }

  function findYieldSectionHeader() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('div,span,h2,h3'));
    var title = nodes.find(function (node) {
      return text(node.textContent) === 'Yield by Work Order';
    });
    if (!title) return null;
    var header = title.parentElement;
    if (!header) return null;
    if (header.parentElement && /flex/.test(getComputedStyle(header.parentElement).display || '')) return header.parentElement;
    return header;
  }

  function mountButton() {
    if (document.getElementById(BUTTON_ID)) return;
    var anchor = findTopbarAnchor();
    var button = makeButton();
    if (anchor && anchor.parentElement) {
      anchor.insertAdjacentElement('afterend', button);
      return;
    }
    var header = findYieldSectionHeader();
    if (header) {
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.gap = '10px';
      header.appendChild(button);
    }
  }

  var observer = new MutationObserver(function () { mountButton(); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mountButton();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  } else {
    mountButton();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.traceOpsExportProductImprovement = exportReport;
  window.TRACEOPS_PRODUCT_IMPROVEMENT_EXPORT_VERSION = VERSION;
}());
