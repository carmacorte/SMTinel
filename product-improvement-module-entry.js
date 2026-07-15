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
  openYieldFlow();
  var started=Date.now();
  var timer=setInterval(function(){
    try{
      if(typeof window.traceOpsRefreshProductImprovementContext==='function')window.traceOpsRefreshProductImprovementContext();
      var ctx=window.TRACEOPS_YIELD_PRODUCT_EXPORT_CONTEXT;
      if(ctx&&ctx.model&&Array.isArray(ctx.model.rows)&&ctx.model.rows.length&&typeof window.traceOpsExportProductImprovement==='function'){
        clearInterval(timer);
        window.traceOpsExportProductImprovement();
        return;
      }
      if(Date.now()-started>12000){
        clearInterval(timer);
        alert('Carga primero el ZIP de Yield Flow y abre la tabla Yield by Work Order.');
      }
    }catch(e){
      clearInterval(timer);
      console.error('[SMTinel Product Improvement Module]',e);
      alert('Product Improvement: '+(e&&e.message?e.message:e));
    }
  },400);
}
function icon(){
  return '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/><path d="M16 8h3v3"/></svg>';
}
function makeTile(sample){
  var tile=sample?sample.cloneNode(false):document.createElement('button');
  tile.id=ID;
  tile.type='button';
  tile.innerHTML=icon()+'<span>Product Improvement</span>';
  tile.title='Export weighted before/after product improvement report';
  tile.addEventListener('click',runExport);
  return tile;
}
function mount(){
  if(document.getElementById(ID))return;
  var intel=findButton(/^Intel Log$/i);
  if(!intel||!intel.parentElement)return;
  var host=intel.parentElement;
  var tile=makeTile(intel);
  if(host===intel.parentElement){
    intel.insertAdjacentElement('afterend',tile);
  }else{
    host.appendChild(tile);
  }
}
var observer=new MutationObserver(mount);
function start(){mount();observer.observe(document.documentElement,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.traceOpsOpenProductImprovement=runExport;
window.TRACEOPS_PRODUCT_IMPROVEMENT_MODULE_VERSION=VERSION;
}());
