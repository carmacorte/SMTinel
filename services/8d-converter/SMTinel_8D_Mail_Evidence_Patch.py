#!/usr/bin/env python3
"""Inject SMTinel 8D Mail Evidence Viewer into the generated standalone HTML.

The converter keeps original embedded files byte-for-byte. This patch adds a
client-side viewer for .eml as the primary mail evidence format and provides
safe visual handling for .pdf/.msg/.html/.txt evidence without executing mail
scripts or loading remote images.
"""
from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('Uso: python SMTinel_8D_Mail_Evidence_Patch.py reporte.html')
    raise SystemExit(2)

html_path = Path(sys.argv[1]).resolve()
page = html_path.read_text(encoding='utf-8')

if 'smtinel-mail-evidence-v1' in page:
    print('Mail Evidence Viewer already present:', html_path)
    raise SystemExit(0)

css = r'''
<style id="smtinel-mail-evidence-v1-css">
.mail-evidence-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 12px}.mail-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid #6f4c5a;background:#241827;color:#ffd6e1;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800}.mail-card{border:1px solid #60475a;background:linear-gradient(180deg,#1c2639,#111a29);border-radius:14px;padding:15px;margin:0 0 14px;box-shadow:0 10px 24px #0004}.mail-card.eml{border-color:#c85272}.mail-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #344258;padding-bottom:10px;margin-bottom:10px}.mail-title{font-size:15px;font-weight:900;color:#fff;line-height:1.25}.mail-meta{font-size:11px;color:#aebbd0;margin-top:4px}.mail-grid{display:grid;grid-template-columns:130px minmax(0,1fr);gap:7px 12px;font-size:12px;margin:10px 0}.mail-grid b{color:#ffc3d2}.mail-grid span{color:#e6eefb;word-break:break-word}.mail-body{white-space:pre-wrap;line-height:1.55;font-size:12px;color:#dce7f6;background:#0b1322;border:1px solid #32445e;border-radius:10px;padding:12px;max-height:340px;overflow:auto}.mail-actions{margin-top:12px;border-top:1px solid #344258;padding-top:10px}.mail-action-row{display:grid;grid-template-columns:22px minmax(0,1fr) 160px 150px 150px;gap:8px;align-items:start;border-bottom:1px solid #2b394d;padding:8px 0;font-size:12px}.mail-action-row.header{font-weight:900;color:#ffc3d2;text-transform:uppercase;font-size:10px;letter-spacing:.08em}.mail-action-row span{min-width:0;word-break:break-word}.mail-missing{color:#ffd796!important}.mail-preview{width:100%;height:62vh;border:1px solid #41536e;border-radius:10px;background:#0b1322}.mail-warn{background:#38202b;border:1px solid #91445c;color:#ffdbe4;border-radius:10px;padding:10px;margin:9px 0;font-size:12px;line-height:1.5}.mail-small{font-size:11px;color:#aebbd0;line-height:1.5}.mail-tabbar{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 13px}.mail-tabbar button{background:#243148;color:#ced8e8;border:1px solid #43536a;border-radius:8px;padding:8px 11px;font-size:11px;font-weight:800}.mail-tabbar button.active{background:#853049;color:#fff;border-color:#e1617d}.mail-raw{white-space:pre-wrap;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:#d4deee;background:#090f1b;border:1px solid #32445e;border-radius:10px;padding:10px;max-height:280px;overflow:auto}.mail-attachment-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.mail-attach{border:1px solid #455977;background:#172338;color:#dce7f6;border-radius:8px;padding:6px 8px;font-size:11px}.mail-open-btn{background:#b33152;border:1px solid #cc4d69;color:white;border-radius:9px;padding:8px 11px;font-weight:800}.mail-open-btn.secondary{background:#22334e;border-color:#43516b}.mail-open-btn:disabled{opacity:.5}.mail-evidence-count{font-size:11px;color:#ffd6e1}.mail-source-slide{color:#9dd0ff}.mail-pdf-note{font-size:12px;color:#d4deee;line-height:1.5}
@media(max-width:730px){.mail-grid{grid-template-columns:1fr}.mail-action-row{grid-template-columns:20px minmax(0,1fr);gap:5px}.mail-action-row.header{display:none}.mail-action-row span:nth-child(n+3)::before{display:block;color:#ffc3d2;font-weight:800;font-size:10px;letter-spacing:.05em}.mail-action-row span:nth-child(3)::before{content:'Responsable'}.mail-action-row span:nth-child(4)::before{content:'Fecha'}.mail-action-row span:nth-child(5)::before{content:'Estatus'}.mail-preview{height:58vh}}
</style>
'''

js = r'''
<script id="smtinel-mail-evidence-v1">
(function(){
'use strict';
const $ = (id)=>document.getElementById(id);
const dataNode = $('embedded-data');
if(!dataNode) return;
let DATA;
try{DATA=JSON.parse(dataNode.textContent||'{}');}catch(err){console.warn('SMTinel mail evidence: data parse failed',err);return;}
const attachments = Array.isArray(DATA.attachments)?DATA.attachments:[];
const pages = Array.isArray(DATA.pages)?DATA.pages:[];
const MAIL_EXT = /\.(eml|msg)$/i;
const mailEvidence = attachments.map((a,i)=>({...a,_id:i,_name:String(a.name||'evidence_'+i)})).filter(a=>MAIL_EXT.test(a._name) || /^(message\/rfc822|application\/vnd\.ms-outlook)$/i.test(String(a.mime||'')));
if(!mailEvidence.length) return;

function bytesFromB64(b64){const raw=atob(String(b64||''));const arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return arr;}
function textFromBytes(bytes){try{return new TextDecoder('utf-8',{fatal:false}).decode(bytes);}catch(e){let s='';for(const b of bytes)s+=String.fromCharCode(b);return s;}}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function missing(v){return v && String(v).trim()?String(v).trim():'Dato pendiente de confirmar';}
function normalizeWs(s){return String(s||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function decodeMimeWords(str){
 return String(str||'').replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g,(m,cs,enc,text)=>{
  try{
   let bytes;
   if(enc.toUpperCase()==='B') bytes=bytesFromB64(text);
   else{
    let q=text.replace(/_/g,' ').replace(/=([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));
    bytes=new Uint8Array([...q].map(c=>c.charCodeAt(0)&255));
   }
   return new TextDecoder(cs||'utf-8',{fatal:false}).decode(bytes);
  }catch(e){return text;}
 });
}
function decodeQuotedPrintable(s){return String(s||'').replace(/=\r?\n/g,'').replace(/=([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));}
function parseHeaders(block){
 const out={};let last='';
 for(const raw of String(block||'').split(/\n/)){
  if(/^\s/.test(raw)&&last){out[last]+=' '+raw.trim();continue;}
  const m=raw.match(/^([^:]+):(.*)$/);if(!m)continue;
  last=m[1].toLowerCase();out[last]=decodeMimeWords(m[2].trim());
 }
 return out;
}
function parseParams(v){const out={};String(v||'').split(';').slice(1).forEach(p=>{const m=p.match(/\s*([^=]+)=\s*(.*)\s*$/);if(m){let val=m[2].trim().replace(/^"|"$/g,'');out[m[1].toLowerCase().trim()]=decodeMimeWords(val);}});return out;}
function stripHtml(s){return String(s||'').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');}
function decodeBodyByHeaders(body, headers){
 const enc=String(headers['content-transfer-encoding']||'').toLowerCase();
 if(enc.includes('base64')){try{return textFromBytes(bytesFromB64(body.replace(/\s+/g,'')));}catch(e){return body;}}
 if(enc.includes('quoted-printable')) return decodeQuotedPrintable(body);
 return body;
}
function splitMail(raw){const m=raw.match(/\r?\n\r?\n/);if(!m)return [raw,''];return [raw.slice(0,m.index),raw.slice(m.index+m[0].length)];}
function parseEml(att){
 const raw=textFromBytes(bytesFromB64(att.b64));
 const [hblock, bodyBlock]=splitMail(raw);const headers=parseHeaders(hblock);const ct=String(headers['content-type']||'');const params=parseParams(ct);const boundary=params.boundary;
 const parts=[];let plain='',htmlBody='',attachNames=[];
 if(boundary){
  const chunks=bodyBlock.split('--'+boundary).filter(x=>x.trim()&&!x.startsWith('--'));
  for(const chunk of chunks){
   const [ph,pb]=splitMail(chunk.replace(/^\r?\n/,''));const phh=parseHeaders(ph);const pct=String(phh['content-type']||'').toLowerCase();const disp=String(phh['content-disposition']||'').toLowerCase();const pp=parseParams(phh['content-type']||'');const dp=parseParams(phh['content-disposition']||'');const filename=dp.filename||pp.name||'';
   if(filename || disp.includes('attachment')) attachNames.push(filename||'Adjunto sin nombre');
   let decoded=decodeBodyByHeaders(pb,phh);
   if(pct.includes('text/plain') && !plain) plain=decoded;
   if(pct.includes('text/html') && !htmlBody) htmlBody=decoded;
   parts.push({type:pct||'parte sin tipo',disposition:disp,filename:filename||'',size:pb.length});
  }
 }else{
  const decoded=decodeBodyByHeaders(bodyBlock,headers);
  if(ct.toLowerCase().includes('html')) htmlBody=decoded; else plain=decoded;
 }
 const body=normalizeWs(plain || stripHtml(htmlBody) || bodyBlock);
 return {kind:'eml',headers,body,htmlBody,parts,attachNames,raw};
}
function actionCandidates(text){
 const out=[];const lines=normalizeWs(text).split('\n').map(x=>x.trim()).filter(Boolean);
 const actionRx=/^(?:\d+[.)]\s*)?(investigate|assess|develop|verify|validate|inspect|contain|provide|review|confirm|implement|check|evaluate|determine|conduct|propose|prevenir|investigar|validar|verificar|revisar|confirmar|desarrollar|evaluar|inspeccionar)\b/i;
 for(const line of lines){
  if(out.length>=12)break;
  if(actionRx.test(line) || /^\d+[.)]\s+/.test(line)){
   const clean=line.replace(/^\d+[.)]\s*/,'').trim();
   if(clean.length>8)out.push(clean.slice(0,420));
  }
 }
 return out;
}
function blobUrl(att){const bytes=bytesFromB64(att.b64);return URL.createObjectURL(new Blob([bytes],{type:att.mime||guessMime(att._name)}));}
function guessMime(name){if(/\.pdf$/i.test(name))return'application/pdf';if(/\.eml$/i.test(name))return'message/rfc822';if(/\.html?$/i.test(name))return'text/html';if(/\.txt$/i.test(name))return'text/plain';return'application/octet-stream';}
function sourceSlides(att){return (att.slides||[]).map(s=>(s.index??0)+1).join(', ') || 'Dato pendiente de confirmar';}
function downloadOriginal(att){
 if(typeof window.downloadAttachment==='function'){window.downloadAttachment(att._id);return;}
 const url=blobUrl(att);const a=document.createElement('a');a.href=url;a.download=att._name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function buildActionRows(actions){
 if(!actions.length)return '<div class="mail-small">No se detectaron acciones candidatas estructuradas en este correo.</div>';
 return '<div class="mail-actions"><div class="mail-action-row header"><span>#</span><span>Acción candidata</span><span>Responsable</span><span>Fecha</span><span>Estatus</span></div>'+actions.map((a,i)=>'<div class="mail-action-row"><span>'+(i+1)+'</span><span>'+safe(a)+'</span><span class="mail-missing">Dato pendiente de confirmar</span><span class="mail-missing">Dato pendiente de confirmar</span><span class="mail-missing">Dato pendiente de confirmar</span></div>').join('')+'</div>';
}
function renderEmlCard(att){
 let parsed;try{parsed=parseEml(att);}catch(err){parsed={headers:{},body:'No se pudo interpretar el .eml. Archivo original conservado.',attachNames:[],parts:[],raw:''};}
 const h=parsed.headers;const actions=actionCandidates(parsed.body);
 const body=safe(parsed.body.slice(0,18000));
 const attachmentsHtml=parsed.attachNames.length?'<div class="mail-attachment-list">'+parsed.attachNames.map(x=>'<span class="mail-attach">'+safe(x)+'</span>').join('')+'</div>':'<div class="mail-small mail-missing">Adjuntos: Dato pendiente de confirmar o sin adjuntos embebidos.</div>';
 const card=document.createElement('section');card.className='mail-card eml';
 card.innerHTML='<div class="mail-head"><div><div class="mail-title">'+safe(missing(h.subject))+'</div><div class="mail-meta">Mail Evidence · .eml · fuente estructurada · slide(s) '+safe(sourceSlides(att))+'</div></div><span class="mail-pill">EML</span></div>'+ 
 '<div class="mail-grid"><b>From</b><span>'+safe(missing(h.from))+'</span><b>To</b><span>'+safe(missing(h.to))+'</span><b>CC</b><span>'+safe(missing(h.cc))+'</span><b>Date</b><span>'+safe(missing(h.date))+'</span><b>Message-ID</b><span>'+safe(missing(h['message-id']))+'</span><b>Relacionado</b><span class="mail-source-slide">Diapositiva(s) '+safe(sourceSlides(att))+'</span></div>'+ 
 '<div class="mail-tabbar"><button class="active" type="button">Vista legible</button><button type="button">Raw seguro</button></div><div class="mail-body">'+body+'</div><div class="mail-raw hidden">'+safe((parsed.raw||'').slice(0,22000))+'</div>'+attachmentsHtml+buildActionRows(actions)+'<div class="mail-evidence-toolbar"><button class="mail-open-btn" type="button" data-mail-download="'+att._id+'">Descargar .eml original</button><button class="mail-open-btn secondary" type="button" data-mail-slide="'+((att.slides&&att.slides[0]&&att.slides[0].index)||0)+'">Ir a slide fuente</button></div><div class="mail-small">El visor sanitiza el correo: no ejecuta scripts ni carga imágenes remotas. Campos vacíos se mantienen como dato pendiente, no como fantasía administrativa.</div>';
 const tabs=card.querySelectorAll('.mail-tabbar button');const readable=card.querySelector('.mail-body');const raw=card.querySelector('.mail-raw');
 tabs[0].addEventListener('click',()=>{tabs[0].classList.add('active');tabs[1].classList.remove('active');readable.classList.remove('hidden');raw.classList.add('hidden');});
 tabs[1].addEventListener('click',()=>{tabs[1].classList.add('active');tabs[0].classList.remove('active');raw.classList.remove('hidden');readable.classList.add('hidden');});
 return card;
}
function renderGenericCard(att){
 const isPdf=/\.pdf$/i.test(att._name), isMsg=/\.msg$/i.test(att._name), isText=/\.(txt|html?)$/i.test(att._name);
 const card=document.createElement('section');card.className='mail-card';
 const kind=isPdf?'PDF de correo / evidencia visual':isMsg?'Outlook MSG · archivo original conservado':isText?'Texto / HTML guardado':'Evidencia de correo';
 card.innerHTML='<div class="mail-head"><div><div class="mail-title">'+safe(att._name)+'</div><div class="mail-meta">'+safe(kind)+' · '+((att.size||0)/1024).toFixed(1)+' KB · slide(s) '+safe(sourceSlides(att))+'</div></div><span class="mail-pill">'+safe(att._name.split('.').pop().toUpperCase())+'</span></div><div class="mail-warn">Vista estructurada no disponible para este formato. Se conserva el archivo original; los campos de remitente, fecha, destinatarios y acciones quedan como <b>Dato pendiente de confirmar</b> salvo que se agregue un .eml.</div><div class="mail-grid"><b>From</b><span class="mail-missing">Dato pendiente de confirmar</span><b>To</b><span class="mail-missing">Dato pendiente de confirmar</span><b>Date</b><span class="mail-missing">Dato pendiente de confirmar</span><b>Relacionado</b><span class="mail-source-slide">Diapositiva(s) '+safe(sourceSlides(att))+'</span></div><div class="mail-evidence-toolbar"><button class="mail-open-btn" type="button" data-mail-download="'+att._id+'">Descargar original</button>'+(isPdf?'<button class="mail-open-btn secondary" type="button" data-mail-preview="'+att._id+'">Previsualizar PDF</button>':'')+'<button class="mail-open-btn secondary" type="button" data-mail-slide="'+((att.slides&&att.slides[0]&&att.slides[0].index)||0)+'">Ir a slide fuente</button></div><div class="mail-preview-wrap"></div>';
 return card;
}
function openMailEvidence(){
 const overlay=$('overlay'),drawer=$('drawer'),body=$('drawerBody');if(!overlay||!drawer||!body)return;
 overlay.classList.add('visible');drawer.classList.add('open');$('drawerTitle').textContent='Mail Evidence Viewer';$('drawerSubtitle').textContent=mailEvidence.length+' email file(s) detected · .eml/.msg';body.replaceChildren();
 const info=document.createElement('div');info.className='mail-warn';info.innerHTML='Only <b>.eml</b> and <b>.msg</b> files are treated as email. Text, HTML, and PDF files remain regular evidence attachments.';body.append(info);
 mailEvidence.forEach(att=>body.append(/\.eml$/i.test(att._name)||/message\/rfc822/i.test(String(att.mime||''))?renderEmlCard(att):renderGenericCard(att)));
 body.onclick=(ev)=>{
  const d=ev.target.closest('[data-mail-download]');if(d){const att=mailEvidence.find(x=>String(x._id)===String(d.dataset.mailDownload));if(att)downloadOriginal(att);return;}
  const s=ev.target.closest('[data-mail-slide]');if(s){try{if(typeof window.go==='function')window.go(Number(s.dataset.mailSlide)||0);}catch(e){} if(typeof window.closeDrawer==='function')window.closeDrawer();return;}
  const p=ev.target.closest('[data-mail-preview]');if(p){const att=mailEvidence.find(x=>String(x._id)===String(p.dataset.mailPreview));if(att){const wrap=p.closest('.mail-card').querySelector('.mail-preview-wrap');const old=wrap.querySelector('iframe');if(old){old.remove();return;}const iframe=document.createElement('iframe');iframe.className='mail-preview';iframe.setAttribute('sandbox','');iframe.src=blobUrl(att);wrap.append(iframe);}return;}
 };
}
function addMailButton(){
 const top=document.querySelector('.top-metrics')||document.querySelector('.top')||document.body;
 const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.id='openMailEvidence';btn.textContent='Correos ('+mailEvidence.length+')';btn.addEventListener('click',openMailEvidence);
 const ev=$('openEvidence'); if(ev&&ev.parentNode) ev.parentNode.insertBefore(btn,ev); else top.append(btn);
 const badge=document.createElement('span');badge.className='mini em mail-evidence-count';badge.textContent=mailEvidence.length+' mail evidence';
 const metrics=document.querySelector('.top-metrics'); if(metrics) metrics.append(badge);
}
addMailButton();
window.smtinelOpenMailEvidence=openMailEvidence;
})();
</script>
'''

insert = css + js
if '</body>' not in page:
    raise RuntimeError('No se encontró </body> en el HTML generado.')
page = page.replace('</body>', insert + '</body>', 1)
html_path.write_text(page, encoding='utf-8')
print('Mail Evidence Viewer V1 injected:', html_path)
