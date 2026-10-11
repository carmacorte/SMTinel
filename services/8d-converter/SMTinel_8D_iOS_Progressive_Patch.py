#!/usr/bin/env python3
"""Add script-free navigation to a self-contained SMTinel 8D HTML.

No new slide rasterization needed: moves WebP payloads from JSON to HTML img tags.
Existing JavaScript app is retained and activated only after successful initialization.
Usage: python SMTinel_8D_iOS_Progressive_Patch.py input.html output.html
"""
from pathlib import Path
import sys,re,json,html

src=Path(sys.argv[1]); dst=Path(sys.argv[2]); html_str=src.read_text(encoding='utf-8')
if '<section id="safariFallback"' in html_str:
 raise SystemExit('Already patched')
match=re.search(r'(<script\s+id="embedded-data"\s+type="application/json">)(.*?)(</script>)',html_str,flags=re.S)
if not match: raise RuntimeError('embedded-data not found')
data=json.loads(match.group(2)); slides=data['pages']; attachments=data['attachments']
assert slides and all(p.get('b64') for p in slides)
assert 'renderSlide()' in html_str
esc=lambda v: html.escape(str(v),quote=True)

css='''
/* Progressive mobile iOS Files/QuickLook fallback: renders without JavaScript. */
html:not(.js-active) .app,html:not(.js-active) .right-overlay,html:not(.js-active) .drawer{display:none!important}
html.js-active #safariFallback{display:none!important}
#safariFallback{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#0c1424;color:#eff3fa;min-height:100%;padding-bottom:55px;overflow-wrap:anywhere}
#safariFallback *{box-sizing:border-box}
#safariFallback a{color:#b8d9ff}
#safariFallback .sf-top{position:sticky;top:0;z-index:10;background:#16233a;border-bottom:1px solid #3d4b62;display:flex;align-items:center;justify-content:space-between;padding:12px 15px;gap:12px;min-height:58px}
#safariFallback .sf-top strong{font-size:15px}
#safariFallback .sf-top small{display:block;color:#afc0d4;font-size:10px}
#safariFallback .sf-top a{background:#9e284c;border:1px solid #ca607c;border-radius:9px;padding:8px 10px;color:white;text-decoration:none;white-space:nowrap;font-weight:750;font-size:12px}
#safariFallback .sf-info{background:#18253b;color:#c8d4e5;padding:11px 16px;font-size:12px}
#safariFallback .sf-note{font-size:11px;color:#e8d4aa;margin-top:5px}
#safariFallback .sf-index{margin:10px auto;max-width:1200px;border:1px solid #3d4b60;border-radius:9px;background:#152036;padding:9px 12px}
#safariFallback .sf-index summary{cursor:pointer;font-weight:750;color:#e6f0ff}
#safariFallback .sf-index-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:5px;padding:12px 0 5px}
#safariFallback .sf-index-grid a{border:1px solid #33425a;background:#1e2b42;text-decoration:none;padding:9px;border-radius:6px;font-size:12px}
#safariFallback .sf-index-grid .sf-evidence-link{background:#79314b;color:#fff}
#safariFallback .sf-slide{max-width:1200px;margin:14px auto 22px;background:#152137;border:1px solid #43536a;border-radius:12px;overflow:hidden;scroll-margin-top:70px;}
#safariFallback .sf-slide-head{padding:11px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px}
#safariFallback .sf-slide-head strong{font-size:14px}
#safariFallback .sf-slide-head small{display:block;color:#b7c4d6;font-size:10px}
#safariFallback .sf-pager{display:flex;align-items:center;gap:6px;flex:none}
#safariFallback .sf-pager a,#safariFallback .sf-pager span{display:inline-block;background:#243754;color:#fff;border:1px solid #455a79;border-radius:7px;padding:6px 9px;min-width:30px;text-align:center;text-decoration:none;font-size:13px}
#safariFallback .sf-picture{background:#fff;}
#safariFallback .sf-picture img{display:block;max-width:100%;width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;background:white}
#safariFallback .sf-tools{padding:9px 14px;display:flex;gap:12px;flex-wrap:wrap}
#safariFallback .sf-tools details{min-width:100%;}
#safariFallback .sf-tools summary{color:#f0bdce;cursor:pointer;font-size:12px;font-weight:750}
#safariFallback .sf-tools pre{white-space:pre-wrap;word-break:break-word;font:12px/1.55 system-ui,sans-serif;color:#d3deec;background:#0d1929;padding:12px;border-radius:7px;max-height:260px;overflow:auto}
#safariFallback .sf-inline-evidence{background:#3f2e31;color:#ffe1ba;border:1px solid #86634d;border-radius:7px;padding:10px;margin:6px 0;}
#safariFallback .sf-inline-evidence a{font-weight:700}
#safariFallback .sf-assets{max-width:1200px;margin:20px auto;border:1px solid #77516b;background:#152036;padding:14px;border-radius:10px;scroll-margin-top:70px}
#safariFallback .sf-assets h2{margin:0 0 9px;font-size:18px}
#safariFallback .sf-assets details{margin:10px 0;border:1px solid #37465c;border-radius:8px;padding:10px;background:#1d2d44}
#safariFallback .sf-assets summary{cursor:pointer;font-weight:750}
#safariFallback .sf-assets .sf-download{display:inline-block;color:white;background:#ad3656;border-radius:7px;padding:9px;margin:10px 0;text-decoration:none}
#safariFallback .sf-table-overflow{overflow:auto;max-height:410px;border:1px solid #526378;border-radius:6px;margin:10px 0}
#safariFallback .sf-table-overflow table{border-collapse:collapse;font-size:11px;min-width:100%;width:max-content}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{border-bottom:1px solid #3d4c62;text-align:left;padding:7px 9px;white-space:nowrap}
#safariFallback .sf-table-overflow th{background:#314257;position:sticky;top:0}
#safariFallback .sf-warning{color:#bfc8d7;font-size:12px}
@media(max-width:740px){#safariFallback{font-size:12px}#safariFallback .sf-top{padding:10px 9px}#safariFallback .sf-top strong{font-size:12px}#safariFallback .sf-slide{border-radius:0;margin:12px 0 19px}#safariFallback .sf-slide-head{padding:9px}#safariFallback .sf-slide-head strong{font-size:11px}#safariFallback .sf-pager a{font-size:11px;padding:6px 8px}#safariFallback .sf-index{margin:8px}#safariFallback .sf-assets{margin:8px}}
'''
# The fallback is a normal HTML page, not a script-generated subtree.
sections=[]
for i,p in enumerate(slides):
 no=i+1
 prev=f'<a href="#sf-slide-{no-1}" title="Anterior">←</a>' if i else '<span>←</span>'
 nxt=f'<a href="#sf-slide-{no+1}" title="Siguiente">→</a>' if i+1<len(slides) else '<span>→</span>'
 notes=(f'<details><summary>Notas originales</summary><pre>{esc(p["notes"])}</pre></details>' if p.get('notes') else '')
 ass=(f'<div class="sf-inline-evidence">Archivo incrustado: <a href="#sf-evidence">Abrir evidencias</a></div>' if p['attachmentIds'] else '')
 emails=''.join(f'<a href="{esc(l["href"])}" style="margin-right:14px">{esc(l["title"])}</a>' for l in p.get('links',[]) if l.get('href','').lower().startswith(('mailto:','https:','http:')))
 links=(f'<details><summary>{len(p["links"])} enlaces originales</summary>{emails}</details>' if emails else '')
 slide_img=f'<img id="sf-img-{no}" alt="Diapositiva {no} · {esc(p["title"])}" loading="{"eager" if i==0 else "lazy"}" decoding="async" src="data:image/webp;base64,{p.pop("b64")}"/>'
 sections.append(f'''<article class="sf-slide" id="sf-slide-{no}"><div class="sf-slide-head"><div><strong>{no:02d} / {len(slides)} · {esc(p['title'])}</strong><small>{esc(p['group'])}</small></div><nav class="sf-pager" aria-label="Navegar diapositivas">{prev}{nxt}</nav></div><div class="sf-picture">{slide_img}</div><div class="sf-tools">{ass}{notes}{links}</div></article>''')

nav=''.join(f'<a href="#sf-slide-{i+1}">{i+1:02d} · {esc(p["title"])}</a>' for i,p in enumerate(slides))
asset_html=[]
for idx,a in enumerate(attachments):
 data_url='data:'+esc(a['mime'])+';base64,'+a['b64']
 sheetparts=[]
 for sheet in a.get('sheets',[]):
  rows=sheet.get('rows',[]); head=rows[0] if rows else []
  cols=max(len(head),max((len(r) for r in rows[:30]),default=0))
  if cols:
   headers=''.join(f'<th>{esc(head[j] if j<len(head) else "")}</th>' for j in range(cols))
   htmlrows=[]
   for row in rows[1:]:
    htmlrows.append('<tr>'+''.join(f'<td>{esc(row[j] if j<len(row) else "")}</td>' for j in range(cols))+'</tr>')
   sheetparts.append(f'<details><summary>{esc(sheet["name"])} · {sheet.get("count",len(rows)-1):,} registros</summary><div class="sf-table-overflow"><table><thead><tr>{headers}</tr></thead><tbody>{"".join(htmlrows)}</tbody></table></div></details>')
 asset_html.append(f'''<div class="sf-inline-evidence"><strong>{esc(a['name'])}</strong> · {a['size']/1024:.1f} KB · diapositiva(s) {', '.join(str(sp['index']+1) for sp in a['slides'])}<p><a class="sf-download" download="{esc(a['name'])}" href="{data_url}">Descargar archivo original</a></p><div class="sf-warning">Si el visor de Archivos bloquea la descarga, utiliza las tablas de consulta inferiores o abre el HTML en un navegador completo.</div>{''.join(sheetparts)}</div>''')

fallback=f'''<section id="safariFallback" aria-label="Modo compatible sin JavaScript">
<header class="sf-top"><div><strong>SMTinel · 8D Interactive</strong><small>{esc(data['subtitle'])} · {len(slides)} diapositivas</small></div><a href="#sf-evidence">Evidencias ({len(attachments)})</a></header>
<div class="sf-info">Visor compatible con previsualización de archivos de iPhone. Puedes leer las láminas y avanzar con las flechas sin ejecutar JavaScript.<div class="sf-note">Para búsqueda avanzada, zoom interactivo y descarga asistida, abre el HTML en Safari, Edge o Chrome como una página web.</div></div>
<details class="sf-index"><summary>Índice de diapositivas · abrir</summary><nav class="sf-index-grid">{nav}<a href="#sf-evidence" class="sf-evidence-link">Evidencias originales</a></nav></details>
{''.join(sections)}
<section id="sf-evidence" class="sf-assets"><h2>Evidencias originales del PowerPoint</h2><p class="sf-warning">Las tablas siguientes permiten consultar la trazabilidad sin ejecutar scripts. Las evidencias incrustadas conservan sus bytes originales.</p>{''.join(asset_html)}<p class="sf-warning">SMTinel · documento interno de calidad. Proteger conforme a las reglas de confidencialidad aplicables.</p><a href="#sf-slide-1">↑ Volver al inicio</a></section>
</section>'''

# Re-serialize data WITHOUT slide images to avoid duplicate base64 payloads.
safe=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
html_str=html_str[:match.start(2)]+safe+html_str[match.end(2):]
# Insert fallback markup outside app/drawer and CSS before closing style.
html_str=html_str.replace('</style></head>',css+'\n</style></head>',1)
html_str=html_str.replace('<script id="embedded-data" type="application/json">',fallback+'\n<script id="embedded-data" type="application/json">',1)
# JS takes image sources from static fallback markup, keeping existing app behavior.
old="$('slideImage').src='data:image/webp;base64,'+p.b64;"
new="$('slideImage').src=$('sf-img-'+p.number).getAttribute('src');"
if old not in html_str:raise RuntimeError('renderSlide source not found')
html_str=html_str.replace(old,new,1)
# When no scripts run, the fallback is shown. Hide it ONLY after app bootstraps.
tail="$('attachmentsBadge').textContent=A.length+' archivo(s) recuperado(s)';renderSlide();"
if tail not in html_str:raise RuntimeError('init tail not found')
html_str=html_str.replace(tail,tail+"document.documentElement.classList.add('js-active');requestAnimationFrame(fitWidth);",1)
# Force full height fallbacks to scroll on iOS HTML previews.
# Robust layout: do not require JavaScript to obtain basic view and direct evidence.
dst.write_text(html_str,encoding='utf-8')
print('Generated:',dst,'bytes:',dst.stat().st_size,'slides',len(slides),'attachments',len(attachments))
