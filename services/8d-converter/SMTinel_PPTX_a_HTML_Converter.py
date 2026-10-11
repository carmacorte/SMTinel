#!/usr/bin/env python3
"""Build a self-contained, read-only interactive HTML from a PowerPoint 8D.
Requires LibreOffice, PyMuPDF, Pillow, python-pptx and openpyxl.
The PPTX itself is never changed; embedded attachments are preserved byte-for-byte.
"""
import os, sys, io, re, json, base64, zipfile, hashlib, subprocess, pathlib, html, datetime, mimetypes, tempfile, shutil
from urllib.parse import urlparse
from collections import defaultdict
import fitz
from PIL import Image
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
import openpyxl

SRC=pathlib.Path(sys.argv[1]).resolve()
DST=pathlib.Path(sys.argv[2]).resolve() if len(sys.argv)>2 else pathlib.Path('/mnt/data/SMTinel_8D_Interactive_S1_Stuck.html')
WORK=DST.parent/'.8d_interactive_cache'
WORK.mkdir(parents=True,exist_ok=True)
PDF=WORK/'lo'/ (SRC.stem+'.pdf')
if not PDF.exists():
 (WORK/'lo').mkdir(exist_ok=True)
 executable=shutil.which('libreoffice') or shutil.which('soffice')
 if not executable:raise RuntimeError('Se requiere LibreOffice / soffice para renderizar el PPTX. Instálalo y agrégalo a PATH.')
 with tempfile.TemporaryDirectory() as tmp:
  cmd=[executable,'-env:UserInstallation='+pathlib.Path(tmp).as_uri(),'--headless','--convert-to','pdf','--outdir',str(WORK/'lo'),str(SRC)]
  subprocess.run(cmd,check=True,timeout=180)
prs=Presentation(str(SRC))
doc=fitz.open(PDF)
assert len(prs.slides)==len(doc), (len(prs.slides),len(doc))
N=len(doc)

# Grouping is derived from the headings in this specific 8D. A generic fallback is provided.
CASE_PILOT=('S1' in SRC.name.upper() and ('DAVIN' in SRC.name.upper() or 'OCTAVIO' in SRC.name.upper()))
CASE_GROUPS={1:'Portada',2:'Contenido',3:'D1 · Equipo',4:'D2 · Problema',5:'D2 · Evidencia',6:'D3 · Contención',7:'D4 · Análisis',8:'D4 · Análisis',9:'D4 · Análisis',10:'D4 · Análisis',11:'D4 · Causas raíz',12:'D5 · Acciones',13:'D5 · Proceso',14:'D6 · Verificación',15:'D7 · Prevención',**{i:'Evidencias' for i in range(16,25)},25:'D8 · Equipo'} if N==25 and CASE_PILOT else {}
GROUP_ORDER=['Portada','Contenido','D1 · Equipo','D2 · Problema','D2 · Evidencia','D3 · Contención','D4 · Análisis','D4 · Causas raíz','D5 · Acciones','D5 · Proceso','D6 · Verificación','D7 · Prevención','Evidencias','D8 · Equipo']

z=zipfile.ZipFile(SRC)
zip_names=set(z.namelist())
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

# Extract original embedded office documents using OOXML relationships (no OLE execution).
attachments=[];attach_index={}
for i,slide in enumerate(prs.slides,1):
 rel_path=f'ppt/slides/_rels/slide{i}.xml.rels'
 if rel_path not in zip_names:continue
 from lxml import etree
 root=etree.fromstring(z.read(rel_path))
 rmap={node.get('Id'):(node.get('Type',''),node.get('Target','')) for node in root}
 for sh in slide.shapes:
  if sh.shape_type!=MSO_SHAPE_TYPE.EMBEDDED_OLE_OBJECT:continue
  node=sh._element
  for ole in node.xpath('.//p:oleObj'):
   rid=ole.get('{%s}id'%ns['r'])
   ttype,target=rmap.get(rid,('',''))
   if not target:continue
   fn=pathlib.PurePosixPath(target).name
   zip_target='ppt/embeddings/'+fn
   if zip_target not in zip_names:continue
   data=z.read(zip_target)
   sha=hashlib.sha256(data).hexdigest()
   key=(zip_target,sha)
   if key not in attach_index:
    entry={'name':fn,'type':'Excel' if fn.lower().endswith('.xlsx') else 'Archivo incrustado','size':len(data),'hash':sha,'mime':mimetypes.guess_type(fn)[0] or 'application/octet-stream','b64':base64.b64encode(data).decode('ascii'),'slides':[], 'sheets':[]}
    if fn.lower().endswith('.xlsx'):
     try:
      wb=openpyxl.load_workbook(io.BytesIO(data),data_only=True,read_only=True)
      for ws in wb.worksheets:
       cells=[]
       for row in ws.iter_rows():
        out=[]
        for cell in row:
         v=cell.value
         if v is None:out.append('')
         elif isinstance(v,(datetime.datetime,datetime.date)):out.append(v.strftime('%Y-%m-%d'))
         elif isinstance(v,(int,float)) and '%' in str(cell.number_format):out.append(f'{v*100:.2f}%')
         else:out.append(str(v))
        cells.append(out)
       entry['sheets'].append({'name':ws.title,'rows':cells,'count':len(cells)-1})
      wb.close()
     except Exception as e:entry['parse_warning']=str(e)
    attach_index[key]=len(attachments);attachments.append(entry)
   aid=attach_index[key]
   if not any(point['index']==i-1 for point in attachments[aid]['slides']):
    attachments[aid]['slides'].append({'index':i-1,'bounds':[sh.left/prs.slide_width,sh.top/prs.slide_height,sh.width/prs.slide_width,sh.height/prs.slide_height]})

SLIDE_TITLES={
 1:'8D Corrective Action Report',2:'Contents',3:'D1 · Establish Team Approach',4:'D2 · Problem Description',5:'D2 · Good / Bad Part',
 6:'D3 · Containment Actions',7:'D4 · Process Flow',8:'D4 · Replicated Failure',9:'D4 · 5 Why Analysis',
 10:'D4 · Cause & Effect',11:'D4 · Root Cause Summary',12:'D5 · Corrective Actions',13:'D5 · New Process Flow',
 14:'D6 · Verify Effectiveness',15:'D7 · Preventive Actions',16:'Evidence · Supplier Profile',17:'Evidence · Reflow Profile',
 18:'Evidence · PIP / Wave Solder',19:'Evidence · Kapton & Green Dot',20:'Evidence · Quality Alert',
 21:'Evidence · Team Communication',22:'Evidence · Stencil Validation',23:'Evidence · Rework Instructions',
 24:'Evidence · Flux Contamination',25:'D8 · Congratulate the Team'
} if CASE_PILOT else {}
# Slide media rendered at high resolution; all embedded locally as WebP.
slides=[];total_bytes=0
for n,(s,page) in enumerate(zip(prs.slides,doc),1):
 target_width=2160
 matrix=fitz.Matrix(target_width/page.rect.width,target_width/page.rect.width)
 pix=page.get_pixmap(matrix=matrix,alpha=False,colorspace=fitz.csRGB)
 img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
 buf=io.BytesIO();img.save(buf,'WEBP',quality=86,method=4)
 full=buf.getvalue(); total_bytes+=len(full)
 thumb=img.copy();thumb.thumbnail((230,145),Image.Resampling.LANCZOS)
 tb=io.BytesIO();thumb.save(tb,'WEBP',quality=70,method=3)
 links=[]
 for ln in page.get_links():
  uri=ln.get('uri','')
  if ln.get('kind')!=fitz.LINK_URI or not uri.lower().startswith(('mailto:','https://','http://')):continue
  rec=ln['from']
  links.append({'href':uri,'title':uri[7:] if uri.startswith('mailto:') else uri,'bounds':[round(rec.x0/page.rect.width,6),round(rec.y0/page.rect.height,6),round(rec.width/page.rect.width,6),round(rec.height/page.rect.height,6)]})
 note=''
 try:
  ns=s.notes_slide
  if ns.notes_text_frame:note=ns.notes_text_frame.text or ''
  note=re.sub(r'\A\s*\d+\s*\n','',note).strip()
 except Exception:pass
 title=SLIDE_TITLES.get(n, next(iter([sh.text.split('\n')[0].strip() for sh in s.shapes if sh.has_text_frame and sh.text.strip()]),f'Diapositiva {n}'))
 slides.append({'number':n,'title':title,'group':CASE_GROUPS.get(n,'Diapositivas'),'b64':base64.b64encode(full).decode('ascii'),'thumb':base64.b64encode(tb.getvalue()).decode('ascii'),
                'text':page.get_text('text')[:14000], 'notes':note,'links':links,'attachmentIds':[idx for idx,a in enumerate(attachments) if any(x['index']==n-1 for x in a['slides'])]})
 if n%5==0:print('rendered',n,'/',N, 'total WebP MB',round(total_bytes/1024**2,2),flush=True)

display_title='S1 Stuck · Davinci / Octavio / Pictoris / Brooklyn' if CASE_PILOT else SRC.stem
context_title='CVEBU / S1 Stuck' if CASE_PILOT else 'PowerPoint original'
payload={'title':'8D Interactive · '+display_title,'subtitle':('CVEBU · Davinci / Octavio / Pictoris / Brooklyn · SMT / PTH / Functional' if CASE_PILOT else SRC.stem),
 'source':SRC.name,'pages':slides,'attachments':attachments,
 'groups':GROUP_ORDER,'slideWidth':doc[0].rect.width,'slideHeight':doc[0].rect.height,'build':'Piloto 01',
 'summary':{'slides':N,'attachments':len(attachments),'links':sum(len(s['links']) for s in slides)}}

template=r'''<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>SMTinel · 8D Interactive · S1 Stuck</title>
<meta name="description" content="8D interactivo autónomo. Diapositivas, evidencia Excel y enlaces conservados. Sin conexión a internet."/>
<style>
:root{color-scheme:dark;--bg:#090f1c;--sidebar:#111a2b;--top:#152035;--panel:#192439;--line:#303b51;--muted:#aab6c9;--accent:#f05a75;--accent2:#e8b665;--white:#f4f7ff}
*{box-sizing:border-box}html,body{height:100%;margin:0;background:var(--bg);color:var(--white);font:14px/1.48 system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}button,input{font:inherit}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.38}
.app{display:grid;grid-template-rows:66px minmax(0,1fr);height:100dvh;min-height:420px}.top{display:flex;align-items:center;gap:15px;padding:0 20px;background:var(--top);border-bottom:1px solid var(--line);z-index:5}.brand{display:flex;gap:12px;align-items:center;min-width:0}.logo{width:39px;height:39px;display:grid;place-items:center;border-radius:12px;background:#ac2846;color:#fff;font-weight:900;letter-spacing:-1.5px;font-size:18px}.brand-title{font-size:17px;font-weight:800;letter-spacing:-.4px;white-space:nowrap}.brand-sub{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}.top-metrics{display:flex;gap:7px;margin-left:auto;align-items:center}.mini{font-size:11px;white-space:nowrap;border:1px solid #3a4860;background:#1c2a42;padding:6px 10px;border-radius:50px;color:#e4eafa}.mini.em{border-color:#765247;color:#ffdb9c}.btn{background:#22334e;border:1px solid #43516b;color:#eff3fb;padding:9px 13px;border-radius:9px;font-weight:650;transition:background .12s}.btn:hover{background:#304362}.btn:focus-visible,.nav-item:focus-visible,input:focus-visible,.hotspot:focus-visible{outline:3px solid #ffe4a0;outline-offset:2px}.btn.primary{background:#b33152;border-color:#cc4d69}.btn.primary:hover{background:#c24464}.mobile-menu{display:none}.main{display:grid;grid-template-columns:292px minmax(0,1fr);min-height:0}.sidebar{background:var(--sidebar);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}.shead{padding:18px 16px 12px;border-bottom:1px solid var(--line)}.shead h2{font-size:14px;margin:0 0 10px}.search{width:100%;border:1px solid #43516b;background:#0d1525;border-radius:9px;padding:11px;color:#fff;outline:none}.search::placeholder{color:#8491a8}.nav-scroll{overflow-y:auto;padding:11px 9px 36px;overscroll-behavior:contain}.group-title{color:#e0a9b9;font-size:10px;letter-spacing:1.25px;text-transform:uppercase;font-weight:800;padding:16px 10px 6px}.nav-item{width:100%;background:transparent;border:1px solid transparent;border-radius:10px;display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;text-align:left;padding:7px;margin:2px 0;color:#ccd6e6;align-items:center}.nav-item:hover{background:#1c293f}.nav-item.active{background:#322033;border-color:#c74765;color:#fff}.thumb{aspect-ratio:16/9;width:76px;object-fit:cover;border-radius:5px;border:1px solid #536078;background:white}.nav-info{min-width:0}.nav-no{font-size:10px;color:#f4a0b6;font-weight:750}.nav-title{display:block;font-size:12px;font-weight:630;line-height:1.25;margin-top:3px}.nav-sub{font-size:10px;color:#a4b2c4;margin-top:3px}.viewer{display:flex;flex-direction:column;min-width:0;min-height:0;background:radial-gradient(ellipse at 50% 5%,#202b42 0,#080e1a 65%)}.viewer-header{display:flex;align-items:center;gap:14px;padding:14px 22px;border-bottom:1px solid #27374e;min-height:72px}.page-title{font-weight:800;font-size:15px;letter-spacing:-.1px}.page-path{color:#94a9c6;font-size:11px;margin-top:2px}.header-right{margin-left:auto;display:flex;gap:8px;align-items:center}.counter{font-size:12px;color:#acb7c9;font-weight:750;padding-right:10px}.stage{flex:1;min-height:0;overflow:auto;display:flex;align-items:flex-start;justify-content:flex-start;padding:30px 18px;scrollbar-color:#61708a transparent}.frame{position:relative;flex:none;box-shadow:0 18px 60px #000a,0 0 0 1px #6f83a338;background:#fff;border-radius:3px;overflow:hidden;margin:auto}.slide-image{display:block;width:100%;height:100%;user-select:none;pointer-events:none}.hotspot{position:absolute;display:flex;align-items:center;justify-content:center;background:rgba(255,181,73,.1);border:2px dashed #f2b75d;color:#f4d28b;border-radius:4px;transition:background .15s;overflow:hidden}.hotspot:hover{background:rgba(243,180,62,.32)}.hotspot.link{background:transparent;border:0}.hotspot.link:hover{background:rgba(59,132,255,.22);outline:2px solid #6daeff}.hotspot .glow{background:#ca9635f0;color:#13141b;font-size:11px;letter-spacing:.1px;border-radius:5px;padding:3px 7px;font-weight:800;box-shadow:0 3px 16px #0007;white-space:nowrap}.stage-info{padding:9px 18px;border-top:1px solid #26344c;color:#9dacbf;display:flex;gap:12px;align-items:center;flex-wrap:wrap;min-height:40px;font-size:11px}.stage-info strong{color:#f0d7de}.footer{min-height:62px;padding:9px 17px;display:flex;align-items:center;justify-content:center;gap:9px;border-top:1px solid #334058;background:#111c2e}.foot-count{font-weight:850;color:#e9effa;min-width:82px;text-align:center;font-size:13px}.zoom-value{font-variant-numeric:tabular-nums;min-width:54px;text-align:center;color:#e0e7f3}.separator{width:1px;height:27px;background:#3b4860;margin:0 5px}.badge{display:inline-flex;align-items:center;gap:6px;background:#333322;color:#ffe09b;border:1px solid #7d6238;padding:7px 11px;border-radius:100px;font-size:11px;font-weight:750}.badge:disabled{color:#9daabc;border-color:#3b4b61;background:#1c2638}.right-overlay{position:fixed;inset:0;background:#060b16ac;z-index:10;display:none}.right-overlay.visible{display:block}.drawer{position:fixed;right:0;top:0;bottom:0;z-index:11;background:#121c2d;border-left:1px solid #3c4a5f;width:min(760px,100%);box-shadow:-24px 0 50px #0008;transform:translateX(110%);transition:transform .23s;display:flex;flex-direction:column}.drawer.open{transform:translateX(0)}.drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:21px 21px 17px;border-bottom:1px solid var(--line)}.drawer-head h2{margin:0;font-size:20px}.drawer-head p{margin:4px 0 0;font-size:12px;color:#a8b6c9}.drawer-body{padding:19px;overflow:auto;flex:1}.evidence-card{border:1px solid #4f5360;background:#1d293b;border-radius:14px;padding:16px;margin-bottom:14px}.evidence-title{font-size:15px;font-weight:800}.evidence-sub{font-size:11px;color:#aebed0;margin:5px 0 13px}.sheet-tabs{display:flex;gap:7px;overflow:auto;padding:11px 0 13px}.sheet-tabs button{flex:none;background:#243148;color:#ced8e8;border:1px solid #43536a;border-radius:7px;padding:8px 11px;font-size:11px;font-weight:750}.sheet-tabs button.active{background:#80334a;color:#fff;border-color:#d75c78}.sheet-wrap{overflow:auto;border:1px solid #3b4e64;border-radius:8px;max-height:400px}.sheet-table{width:max-content;min-width:100%;border-collapse:collapse;font-size:12px}.sheet-table td,.sheet-table th{text-align:left;border-bottom:1px solid #33435b;padding:9px 11px;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis}.sheet-table th{position:sticky;top:0;background:#2a3950;color:#fff}.sheet-table tr:nth-child(even){background:#182338}.sheet-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:5px 0 11px}.sheet-tools input{border:1px solid #52627e;background:#0b1524;border-radius:8px;color:white;padding:9px 10px;min-width:150px;flex:1}.sheet-foot{color:#aebbd0;font-size:11px;display:flex;justify-content:space-between;gap:7px;padding:10px 0}.plain-link{display:block;color:#9dd0ff;word-break:break-all;margin:5px 0;font-size:12px}.notes{white-space:pre-wrap;font-size:12px;line-height:1.6;color:#c8d3e2;max-height:290px;overflow:auto;background:#0d1727;padding:13px;border-radius:8px;border:1px solid #31435d}.empty{padding:16px;border:1px dashed #42556c;border-radius:9px;color:#aab8cc;font-size:12px}.disclaimer{font-size:11px;line-height:1.6;color:#a7b6c9;margin-top:18px;border-top:1px solid #344056;padding-top:14px}.fade{color:#a9b7c9}.hidden{display:none!important}
@media(max-width:1040px){.main{grid-template-columns:238px minmax(0,1fr)}.top-metrics .mini{display:none}.brand-sub{max-width:220px}.stage{padding:20px 12px}}
@media(max-width:730px){.app{grid-template-rows:61px minmax(0,1fr)}.top{padding:0 11px;gap:8px}.mobile-menu{display:block}.brand-title{font-size:14px}.brand-sub{font-size:10px;max-width:230px}.logo{width:34px;height:34px;font-size:15px}.top>.btn{padding:7px 9px;font-size:11px}.top-metrics{display:none}.main{display:block;position:relative;min-height:0}.sidebar{position:absolute;z-index:8;top:0;bottom:0;width:85%;max-width:330px;transform:translateX(-105%);transition:transform .2s;box-shadow:16px 0 32px #0008}.sidebar.open{transform:translateX(0)}.viewer{height:100%;min-height:0}.viewer-header{padding:10px 12px;min-height:65px}.page-title{font-size:13px}.page-path{font-size:10px}.header-right{gap:5px}.header-right .btn{padding:7px 8px;font-size:11px}.counter{padding-right:0}.stage{padding:14px 6px}.footer{gap:5px;padding:7px 6px;min-height:58px}.footer .btn{padding:8px 9px;font-size:12px}.footer .separator{margin:0 1px}.foot-count{min-width:63px;font-size:11px}.zoom-value{min-width:42px;font-size:11px}.drawer-head{padding:16px}.drawer-body{padding:12px}.hotspot .glow{font-size:7px;padding:2px 4px}.stage-info{font-size:10px;min-height:43px}}

@media(max-width:730px){html,body{width:100%;max-width:100%;overflow-x:hidden}.app,.main,.viewer,.top{width:100%;max-width:100vw;min-width:0}.top .brand{flex:1;min-width:0;overflow:hidden}.top .brand>div:last-child{min-width:0;overflow:hidden}.brand-title,.brand-sub{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.brand-sub{max-width:100%;font-size:9px}.top>.btn{flex:0 0 auto;white-space:nowrap}.viewer-header{flex-direction:column;align-items:stretch;gap:3px;padding:8px 11px}.viewer-header>div:first-child{min-width:0;max-width:100%}.page-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.header-right{width:100%;margin-left:0;justify-content:flex-end}.header-right .btn{padding:5px 9px}.stage{min-width:0;max-width:100vw}.frame{margin:0 auto}.footer{display:flex;justify-content:center;gap:4px;width:100%;overflow:hidden;padding:7px 3px}.footer .btn{min-width:0;flex:none;white-space:nowrap;padding:8px 7px}#prev,#next{font-size:0;width:38px;height:37px}#prev:after{content:'←';font-size:20px}#next:after{content:'→';font-size:20px}#fit{font-size:0;width:33px;height:37px}#fit:after{content:'Fit';font-size:11px}.footer .foot-count{min-width:56px;font-size:11px}.footer .zoom-value{min-width:38px;font-size:10px}.footer .separator{margin:0 1px}.stage-info{padding:6px 9px;font-size:9px}}

@media print{.app{height:auto;display:block}.top,.sidebar,.viewer-header,.footer,.stage-info,.drawer,.right-overlay{display:none!important}.main,.viewer,.stage{display:block;padding:0;margin:0;background:white;overflow:visible}.frame{width:100%!important;margin:0;box-shadow:none;page-break-inside:avoid}body{background:white}}
</style></head>
<body><div class="app">
<header class="top"><button id="menuBtn" class="btn mobile-menu" aria-label="Mostrar diapositivas">☰</button><div class="brand"><div class="logo">8D</div><div><div class="brand-title">SMTinel · 8D Interactive</div><div class="brand-sub">S1 Stuck · Davinci / Octavio / Pictoris / Brooklyn</div></div></div><div class="top-metrics"><span class="mini" id="slideTotalBadge">Diapositivas</span><span class="mini em" id="attachmentsBadge">Evidencias</span><span class="mini">Sin conexión</span></div><button id="openEvidence" class="btn primary">Evidencias <span id="evidenceCounter">1</span></button></header>
<div class="main"><aside class="sidebar" id="sidebar"><div class="shead"><h2>Índice de presentación</h2><input id="searchSlide" class="search" placeholder="Buscar en las diapositivas..." aria-label="Buscar texto"/></div><nav id="navScroll" class="nav-scroll" aria-label="Diapositivas"></nav></aside>
<main class="viewer"><div class="viewer-header"><div><div class="page-title" id="pageTitle"></div><div class="page-path" id="pagePath"></div></div><div class="header-right"><span class="counter" id="topCounter"></span><button class="btn" id="openNotes" title="Mostrar notas originales">Notas</button><button class="btn" id="openSlideEvidence" title="Abrir evidencias de esta diapositiva">Adjuntos</button></div></div>
<div class="stage" id="stage" tabindex="0"><div class="frame" id="frame"><img id="slideImage" class="slide-image" alt="Diapositiva original del 8D" draggable="false"/><div id="hotspotLayer"></div></div></div>
<div class="stage-info"><span><strong id="evidenceHint">Presentación original</strong> · Visualización fiel de la diapositiva</span><span id="linkCount"></span><span>Los datos incrustados no se modifican.</span></div>
<div class="footer"><button class="btn" id="prev" aria-label="Diapositiva anterior">← Anterior</button><span class="foot-count" id="counter"></span><button class="btn" id="next" aria-label="Diapositiva siguiente">Siguiente →</button><span class="separator"></span><button class="btn" id="zoomOut" title="Alejar">−</button><span class="zoom-value" id="zoomLabel">100%</span><button class="btn" id="zoomIn" title="Acercar">＋</button><button class="btn" id="fit" title="Ajustar a ventana">Ajustar</button><span class="separator"></span><button class="btn" id="fullscreen" title="Pantalla completa">⛶</button></div></main></div></div>
<div class="right-overlay" id="overlay"></div><aside class="drawer" id="drawer" aria-label="Panel de evidencias"><div class="drawer-head"><div><h2 id="drawerTitle">Evidencias de PowerPoint</h2><p id="drawerSubtitle">Archivos extraídos del PPTX original</p></div><button class="btn" id="closeDrawer" aria-label="Cerrar">✕</button></div><div id="drawerBody" class="drawer-body"></div></aside>
<script id="embedded-data" type="application/json">__DATA__</script>
<script>
'use strict';
const data=JSON.parse(document.getElementById('embedded-data').textContent);
let current=0, zoom=1, search='', currentSheet=0, sheetQuery='',sheetPage=0, activeAttachment=0, drawerMode='evidence';
const $=id=>document.getElementById(id);
const S=data.pages,A=data.attachments;
const mk=(tag,cl,txt)=>{let e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=String(txt);return e;};
function makeBtn(label,cl,fn){let b=mk('button',cl,label);b.type='button';b.addEventListener('click',fn);return b;}
function renderNav(){const nav=$('navScroll');nav.replaceChildren();let last='',count=0;const q=search.trim().toLocaleLowerCase();S.forEach((p,i)=>{if(q && !((p.title+' '+p.group+' '+p.text).toLocaleLowerCase().includes(q)))return;count++;if(p.group!==last){nav.appendChild(mk('div','group-title',p.group));last=p.group;}let btn=makeBtn('','nav-item'+(i===current?' active':''),()=>go(i));btn.dataset.index=i;let thumb=mk('img','thumb');thumb.loading='lazy';thumb.src='data:image/webp;base64,'+p.thumb;thumb.alt='';btn.append(thumb);let info=mk('div','nav-info');info.append(mk('div','nav-no','DIAPOSITIVA '+String(p.number).padStart(2,'0')));info.append(mk('span','nav-title',p.title));const evid=p.attachmentIds.length;if(evid)info.append(mk('div','nav-sub',`${evid} evidencia adjunta`));btn.append(info);nav.append(btn);});if(!count)nav.append(mk('div','empty','No hay diapositivas con esa búsqueda.'));}
function fitWidth(){const st=$('stage');const avail=Math.max(120,st.clientWidth-28);const base=Math.min(1520,avail);const width=Math.round(base*zoom);const frame=$('frame');frame.style.width=width+'px';frame.style.height=Math.round(width*data.slideHeight/data.slideWidth)+'px';}
function renderHotspots(){const layer=$('hotspotLayer');layer.replaceChildren();const p=S[current];let n=0;for(const link of p.links){if(!/^(mailto:|https?:\/\/)/i.test(link.href))continue;let a=mk('a','hotspot link');a.href=link.href;a.title='Abrir enlace: '+link.title;a.setAttribute('aria-label','Abrir enlace: '+link.title);a.style.left=(link.bounds[0]*100)+'%';a.style.top=(link.bounds[1]*100)+'%';a.style.width=(link.bounds[2]*100)+'%';a.style.height=(link.bounds[3]*100)+'%';layer.append(a);n++;}
for(const id of p.attachmentIds){const att=A[id];for(const point of att.slides.filter(x=>x.index===current)){let b=makeBtn('','hotspot',()=>openAttachment(id));let coords=point.bounds;b.style.left=coords[0]*100+'%';b.style.top=coords[1]*100+'%';b.style.width=coords[2]*100+'%';b.style.height=coords[3]*100+'%';b.title='Abrir archivo incrustado: '+att.name;b.setAttribute('aria-label',b.title);let tag=mk('span','glow','Excel ↗');b.append(tag);layer.append(b);}}
$('linkCount').textContent=n?`${n} enlace(s) interactivo(s) en esta lámina`:'';
$('evidenceHint').textContent=p.attachmentIds.length?`${p.attachmentIds.length} archivo(s) incrustado(s) · toca el icono resaltado`:p.links.length?`${p.links.length} enlace(s) interactivo(s)`:p.group;}
function renderSlide(){const p=S[current];$('slideImage').src='data:image/webp;base64,'+p.b64;$('slideImage').alt=`Diapositiva ${p.number}: ${p.title}`;$('pageTitle').textContent=p.title;$('pagePath').textContent=p.group+' · CVEBU / S1 Stuck';$('topCounter').textContent=p.number+' / '+S.length;$('counter').textContent=p.number+' de '+S.length;$('prev').disabled=current===0;$('next').disabled=current===S.length-1;$('openSlideEvidence').textContent=p.attachmentIds.length?'Adjuntos ('+p.attachmentIds.length+')':'Adjuntos';renderHotspots();fitWidth();renderNav();$('stage').scrollTo({top:0,left:0,behavior:'instant'});}
function go(i){current=Math.max(0,Math.min(i,S.length-1));renderSlide();$('sidebar').classList.remove('open');}
function setZoom(v){zoom=Math.min(3,Math.max(.55,v));$('zoomLabel').textContent=Math.round(zoom*100)+'%';fitWidth();}
$('searchSlide').addEventListener('input',e=>{search=e.target.value;renderNav();});
$('menuBtn').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
$('prev').addEventListener('click',()=>go(current-1));$('next').addEventListener('click',()=>go(current+1));
$('zoomOut').addEventListener('click',()=>setZoom(zoom-.25));$('zoomIn').addEventListener('click',()=>setZoom(zoom+.25));$('fit').addEventListener('click',()=>setZoom(1));
$('fullscreen').addEventListener('click',async()=>{try{const e=$('stage');if(!document.fullscreenElement && e.requestFullscreen)await e.requestFullscreen();else if(document.exitFullscreen)await document.exitFullscreen();}catch(err){console.warn(err)}});
addEventListener('resize',fitWidth);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();$('sidebar').classList.remove('open');return;}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if($('drawer').classList.contains('open'))return;if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();go(current+1);}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(current-1);}else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom+.25);}else if(e.key==='-'){e.preventDefault();setZoom(zoom-.25);}});
function openDrawer(mode='evidence'){$('overlay').classList.add('visible');$('drawer').classList.add('open');drawerMode=mode;renderDrawer();}
function closeDrawer(){$('overlay').classList.remove('visible');$('drawer').classList.remove('open');}
$('openEvidence').addEventListener('click',()=>openDrawer('evidence'));
$('openSlideEvidence').addEventListener('click',()=>{const ids=S[current].attachmentIds; if(ids.length)activeAttachment=ids[0];openDrawer('evidence');});
$('openNotes').addEventListener('click',()=>openDrawer('notes'));$('closeDrawer').addEventListener('click',closeDrawer);$('overlay').addEventListener('click',closeDrawer);
function downloadAttachment(id){const a=A[id];const raw=atob(a.b64);const arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);const url=URL.createObjectURL(new Blob([arr],{type:a.mime}));const l=document.createElement('a');l.href=url;l.download=a.name;document.body.append(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function openAttachment(id){activeAttachment=id;currentSheet=0;sheetPage=0;sheetQuery='';openDrawer('evidence');}
function renderDrawer(){const b=$('drawerBody');b.replaceChildren();if(drawerMode==='notes'){const p=S[current];$('drawerTitle').textContent='Notas del PowerPoint';$('drawerSubtitle').textContent='Diapositiva '+p.number+' · '+p.title;b.append(mk('div','notes',p.notes||'Esta diapositiva no contiene notas en el archivo original.'));return;}
$('drawerTitle').textContent='Evidencias del 8D';$('drawerSubtitle').textContent=`${A.length} archivo(s) recuperado(s) · ${data.summary.links} hipervínculos de correo`;
if(!A.length)b.append(mk('div','empty','Este PPTX no contiene documentos incrustados. Las fotografías que se ven en las diapositivas sí se conservan.'));
A.forEach((a,i)=>{const card=mk('section','evidence-card');card.append(mk('div','evidence-title',a.name));card.append(mk('div','evidence-sub',`${a.type} · ${(a.size/1024).toFixed(1)} KB · Diapositiva(s) ${a.slides.map(t=>t.index+1).join(', ')}`));let row=mk('div','sheet-tools');row.append(makeBtn('Descargar original','btn primary',()=>downloadAttachment(i)));row.append(makeBtn('Ir a diapositiva','btn',()=>{closeDrawer();go(a.slides[0].index);}));card.append(row);if(a.sheets?.length){let sheetArea=mk('div');card.append(sheetArea);renderSheetArea(sheetArea,a,i);}else{card.append(mk('p','fade','Este archivo se recuperó sin modificar sus bytes. Vista previa no disponible.'));}b.append(card);});
const linkCard=mk('section','evidence-card');linkCard.append(mk('div','evidence-title','Enlaces originales de PowerPoint'));linkCard.append(mk('div','evidence-sub','Direcciones de correo detectadas en la presentación; solo se abrirán si las seleccionas.'));let list=[];S.forEach(p=>p.links.forEach(l=>list.push(l)));if(list.length){const unique=[...new Set(list.map(l=>l.href))];for(const url of unique){let a=mk('a','plain-link',url.replace(/^mailto:/,''));a.href=url;linkCard.append(a);}}else linkCard.append(mk('div','empty','No se encontraron hipervínculos.'));b.append(linkCard);
b.append(mk('div','disclaimer','El HTML contiene copias de las diapositivas renderizadas y los documentos incrustados originales. No ejecuta código de Office. Las imágenes incluidas dentro de las diapositivas no constituyen adjuntos independientes. Revisa la información confidencial antes de compartir el archivo.'));
}
function renderSheetArea(target,a,aid){target.replaceChildren();let sheet=a.sheets[Math.max(0,Math.min(currentSheet,a.sheets.length-1))];let tabs=mk('div','sheet-tabs');for(let i=0;i<a.sheets.length;i++){const b=makeBtn(`${a.sheets[i].name} · ${a.sheets[i].count.toLocaleString('es-MX')}`,'',()=>{currentSheet=i;sheetPage=0;sheetQuery='';renderSheetArea(target,a,aid)});if(i===currentSheet)b.classList.add('active');tabs.append(b);}target.append(tabs);
const tools=mk('div','sheet-tools');const q=mk('input');q.placeholder='Buscar dentro de la hoja...';q.value=sheetQuery;q.setAttribute('aria-label','Buscar dentro de la hoja');tools.append(q);target.append(tools);const scroller=mk('div','sheet-wrap');target.append(scroller);const foot=mk('div','sheet-foot');target.append(foot);
function draw(){const grid=sheet.rows||[];const heading=grid[0]||[];const term=sheetQuery.toLocaleLowerCase();const hits=grid.slice(1).filter(r=>!term||r.some(v=>String(v).toLocaleLowerCase().includes(term)));const pages=Math.max(1,Math.ceil(hits.length/40));sheetPage=Math.min(sheetPage,pages-1);scroller.replaceChildren();const table=mk('table','sheet-table');let thead=document.createElement('thead');let tr=document.createElement('tr');for(const h of heading){tr.append(mk('th','',h||'Columna'));}thead.append(tr);table.append(thead);const tbody=document.createElement('tbody');hits.slice(sheetPage*40,(sheetPage+1)*40).forEach(row=>{let tr=mk('tr');for(let i=0;i<heading.length;i++){let td=mk('td','',row[i]??'');td.title=String(row[i]??'');tr.append(td);}tbody.append(tr);});table.append(tbody);scroller.append(table);foot.replaceChildren();foot.append(mk('span','',`${hits.length.toLocaleString('es-MX')} registros · Página ${sheetPage+1}/${pages}`));let controls=mk('div','sheet-tools');let prev=makeBtn('←','btn',()=>{sheetPage--;draw();});prev.disabled=sheetPage<=0;let next=makeBtn('→','btn',()=>{sheetPage++;draw();});next.disabled=sheetPage>=pages-1;controls.append(prev,next);foot.append(controls);}
q.addEventListener('input',e=>{sheetQuery=e.target.value;sheetPage=0;draw();});draw();}
$('evidenceCounter').textContent=A.length;$('slideTotalBadge').textContent=S.length+' diapositivas';$('attachmentsBadge').textContent=A.length+' archivo(s) recuperado(s)';renderSlide();
</script></body></html>'''

safe=json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
page=template.replace('SMTinel · 8D Interactive · S1 Stuck','SMTinel · 8D Interactive · '+html.escape(display_title))
page=page.replace('S1 Stuck · Davinci / Octavio / Pictoris / Brooklyn',html.escape(display_title))
page=page.replace('CVEBU / S1 Stuck',html.escape(context_title))
page=page.replace('__DATA__',safe)
# Official SMTinel shield favicon embedded in every exported HTML.
iconfile=pathlib.Path(__file__).resolve().parent/'smtinel_favicon.png'
if iconfile.exists():
 iconuri='data:image/png;base64,'+base64.b64encode(iconfile.read_bytes()).decode('ascii')
 page=page.replace('<meta name="description"', '<link rel="icon" type="image/png" sizes="64x64" href="'+iconuri+'"/><link rel="apple-touch-icon" href="'+iconuri+'"/><meta name="description"',1)

DST.write_text(page,encoding='utf-8')
print('HTML:',DST,'MB',round(DST.stat().st_size/1024**2,2),'renderedMB',round(total_bytes/1024**2,2),'slides',N,'attachments',len(attachments),'links',payload['summary']['links'])
for a in attachments:
 print('attachment',a['name'],'size',a['size'],'sha',a['hash'][:12], 'slides',a['slides'],'sheets',[(s['name'],s['count']) for s in a.get('sheets',[])])
# save a manifest for internal QA
(WORK/'manifest.json').write_text(json.dumps({'slides':N,'links':payload['summary']['links'],'attachments':[{k:v for k,v in a.items() if k not in ('b64','sheets')} for a in attachments],'html_bytes':DST.stat().st_size},ensure_ascii=False,indent=2),encoding='utf-8')
