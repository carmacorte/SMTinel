/* SMTinel Product Improvement visible module entry */
(function(){
'use strict';
var ID='smtinel-product-improvement-module';
var VERSION='product-improvement-module-v4';
function txt(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
function buttons(){return Array.prototype.slice.call(document.querySelectorAll('button'));}
function findButton(re){return buttons().find(function(b){return re.test(txt(b.textContent));})||null;}
function closeMore(){var more=find