/*
 * SMTinel Board Impact unified export center
 *
 * Owns the visible Board Impact export controls and restores them whenever
 * legacy scripts or React re-renders replace the center contents. The actual
 * workbook generation remains delegated to the existing v94 export listener,
 * which already respects the active Yield Flow / Board Impact filters.
 */
(function () {
  'use strict';

  var VERSION = 'board-export-center-v1';
  var CENTER_ID = 'board-impact-export