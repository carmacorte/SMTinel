/* SMTinel Product Improvement visible module entry v5 */
(function(){
'use strict';
var ID='smtinel-product-improvement-module';
var VERSION='product-improvement-module-v5';
function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function buttons(){return Array.prototype.slice.call(document.querySelectorAll('button'));}
function findButton(re){return buttons().find(function(b){return re.test(txt(b.textContent));})||null;}
function closeMore(){var b=findButton(/^More$/i);if(b)b.click();}
function openYieldFlow(){var b=findButton(/^Yield Flow$/i)||findButton(/Regresar