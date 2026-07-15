/* SMTinel Product Improvement visible module entry */
(function(){
'use strict';
var ID='smtinel-product-improvement-module';
var VERSION='product-improvement-module-v3';
function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function buttons(){return Array.prototype.slice.call(document.querySelectorAll('button'));}
function findButton(re){return buttons().find(function(b){return re.test(txt(b.textContent));})||null;}
function closeMore(){var more=findButton(/^More$/i);if(more)more.click();}
function openYieldFlow(){var b=findButton(/^Yield Flow$/i)||findButton(/Regresar a Yield Flow/i);if(b)b.click();}
function runExport(){
  closeMore();
  open