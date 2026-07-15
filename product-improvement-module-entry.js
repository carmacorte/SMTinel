/* SMTinel Product Improvement module entry v8 */
(function(){
'use strict';
var ID='smtinel-product-improvement-module';
function text(x){return String(x==null?'':x).replace(/\s+/g,' ').trim();}
function all(s){return Array.prototype.slice.call(document.querySelectorAll(s));}
function btn(re){return all('button').find(function(b){return re.test(text(b.textContent));})||null;}
function vis(e){if(!e)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}
function title(){return all('body *').find(function(e){return vis(e)&&/^MORE MODULES$/i.test(text(e.textContent));})||null;}
function panel(){var t=title();if(!t)return null;var e=t;for(var i=0;i<8&&e;i++,e=e.parentElement){var r=e.getBoundingClientRect();if(r.width>500&&r.height>250)return e;}return t.parentElement;}
function run(){var m=btn(/^More$/i);if(m)m.click();var y=btn(/^Yield Flow$/i)||btn(/Regresar a Yield Flow/i);if(y)y.click();var s=Date.now();var x=setInterval(function(){try{if(typeof window.traceOpsRefreshProductImprovementContext==='function')window.traceOpsRefreshProductImprovementContext();var c=window.TRACEOPS_YIELD_PRODUCT_EXPORT_CONTEXT;if(c&&c.model&&Array.isArray(c.model.rows)&&c.model.rows.length&&typeof window.traceOpsExportProductImprovement==='function'){clearInterval(x);window.traceOpsExportProductImprovement();}else if(Date.now()-s>12000){clearInterval(x);alert('Carga primero el ZIP de Yield Flow y abre la tabla Yield by Work Order.');}}catch(e){clearInterval(x);alert('Product Improvement: '+(e&&e.message?e.message:e));}},400);}
function mount(){var p=panel();var old=document.getElementById(ID);if(!p){if(old)old.remove();return;}var r=p.getBoundingClientRect();var b=old||document.createElement('button');if(!old){b.id=ID;b.type='button';b.textContent='Product Improvement';b.onclick=run;document.body.appendChild(b);}b.style.cssText='position:fixed;z-index:2147483647;left:'+(r.left+24)+'px;top:'+(r.bottom-72)+'px;width:260px;height:54px;border-radius:16px;border:1px solid rgba(255,255,255,.25);background:linear-gradient(180deg,#314D6D,#12263D);color:white;font-weight:900;font-size:13px;box-shadow:0 10px 26px rgba(0,0,0,.25);cursor:pointer;';}
function start(){mount();new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});setInterval(mount,1000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.traceOpsOpenProductImprovement=run;
window.TRACEOPS_PRODUCT_IMPROVEMENT_MODULE_VERSION='product-improvement-module-v8';
}());
