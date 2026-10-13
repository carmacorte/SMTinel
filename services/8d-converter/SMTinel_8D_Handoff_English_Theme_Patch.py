#!/usr/bin/env python3
"""Apply SMTinel English Handoff visual theme to generated 8D HTML.

This is a post-processing patch. It does not change slide images, embedded files,
Excel data, links, notes or the original PowerPoint payload. It only updates the
viewer language, labels, icon links and visual skin.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import quote

if len(sys.argv) < 2:
    print('Usage: python SMTinel_8D_Handoff_English_Theme_Patch.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
marker = 'smtinel-8d-english-handoff-theme-v2'
if marker in text:
    print('English Handoff theme already present:', path)
    raise SystemExit(0)

# Autonomous SMTinel icon. Kept as inline SVG data URI so the exported HTML
# remains portable and does not depend on GitHub, Supabase, Railway or browser cache.
svg_icon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="18" y1="18" x2="110" y2="110" gradientUnits="userSpaceOnUse">
      <stop stop-color="#20372d"/>
      <stop offset="1" stop-color="#8aa96f"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="30" fill="#f6f8f2"/>
  <circle cx="64" cy="64" r="47" fill="url(#g)"/>
  <path d="M28 42h57c13 0 23 10 23 22s-10 22-23 22H28v-9h57c8 0 14-6 14-13s-6-13-14-13H28v-9Z" fill="#f7faf3"/>
  <path d="M28 58h58v8H28v-8Zm0 16h44v8H28v-8Z" fill="#f7faf3"/>
  <path d="M85 51c8 0 14 6 14 13s-6 13-14 13H73l16-13-16-13h12Z" fill="#1b2d25" opacity=".95"/>
</svg>'''
icon_uri = 'data:image/svg+xml,' + quote(svg_icon, safe='/:')

# Language, document metadata and embedded icon.
text = re.sub(r'<html\s+lang="[^"]*"', '<html lang="en"', text, count=1)
text = text.replace('SMTinel · 8D Interactive', 'SMTinel · 8D Handoff')
text = re.sub(
    r'<meta name="description" content="[^"]*"\s*/>',
    '<meta name="description" content="Portable SMTinel 8D handoff package. Slides, embedded evidence, links and attachments are preserved offline."/>',
    text,
    count=1,
)
text = re.sub(r'<link\s+rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>\s*', '', text, flags=re.I)
icon_links = (
    f'<link rel="icon" type="image/svg+xml" href="{icon_uri}"/>\n'
    f'<link rel="apple-touch-icon" href="{icon_uri}"/>'
)
if '<meta name="description"' in text:
    text = text.replace('<meta name="description"', icon_links + '\n<meta name="description"', 1)
else:
    text = text.replace('</title>', '</title>\n' + icon_links, 1)

# UI copy. The exported PowerPoint slide images and PowerPoint notes remain untouched.
replacements = {
    'Notas originales': 'Original notes',
    'Diapositivas y notas': 'Slides and notes',
    'Notas del PowerPoint': 'PowerPoint notes',
    'Esta diapositiva no contiene notas en el archivo original.': 'This slide has no notes in the original file.',
    'Ir a diapositiva': 'Go to slide',
    'Descargar original': 'Download original',
    'No hay diapositivas con esa búsqueda.': 'No slides match your search.',
    'Evidencias (': 'Evidence (',
    'DIAPOSITIVA ': 'SLIDE ',
    'Índice de presentación': 'Presentation Index',
    'Buscar en las diapositivas...': 'Search slides...',
    'Diapositivas': 'Slides',
    'diapositivas': 'slides',
    'Evidencias': 'Evidence',
    'evidencias': 'evidence',
    'Sin conexión': 'Offline',
    'Notas': 'Notes',
    'Adjuntos': 'Attachments',
    'Anterior': 'Previous',
    'Siguiente': 'Next',
    'Ajustar': 'Fit',
    'Pantalla completa': 'Fullscreen',
    'Presentación original': 'Original presentation',
    'Visualización fiel de la diapositiva': 'faithful slide rendering',
    'Los datos incrustados no se modifican.': 'Embedded data is preserved without modification.',
    'Evidencias de PowerPoint': 'PowerPoint Evidence',
    'Archivos extraídos del PPTX original': 'Files recovered from the original PPTX',
    'Cerrar': 'Close',
    'Mostrar diapositivas': 'Show slides',
    'Mostrar notas originales': 'Show original notes',
    'Abrir evidencias de esta diapositiva': 'Open evidence for this slide',
    'Diapositiva': 'Slide',
    'Archivo incrustado': 'Embedded file',
    'Modo compatible sin JavaScript': 'JavaScript-free compatibility mode',
    'Visor compatible con previsualización de archivos de iPhone. Puedes leer las láminas y avanzar con las flechas sin ejecutar JavaScript.': 'Mobile-compatible viewer for iPhone Files and restricted previews. Slides can be reviewed with basic navigation even when JavaScript is blocked.',
    'Para búsqueda avanzada, zoom interactivo y descarga asistida, abre el HTML en Safari, Edge o Chrome como una página web.': 'For search, interactive zoom and assisted downloads, open the HTML in Safari, Edge or Chrome as a normal web page.',
    'Índice de diapositivas · abrir / evidencias arriba': 'Presentation index · open / evidence first',
    'Índice de diapositivas · abrir': 'Presentation index · open',
    'Evidencias originales': 'Original evidence',
    'Evidencias originales del PowerPoint': 'Original PowerPoint evidence',
    'Las tablas siguientes permiten consultar la trazabilidad sin ejecutar scripts. Las evidencias incrustadas conservan sus bytes originales.': 'The tables below allow evidence review without running scripts. Embedded files preserve their original bytes.',
    'Descargar archivo original': 'Download original file',
    'Si el visor de Archivos bloquea la descarga, utiliza las tablas de consulta inferiores o abre el HTML en un navegador completo.': 'If the Files preview blocks downloads, use the tables below or open the HTML in a full browser.',
    'SMTinel · documento interno de calidad. Proteger conforme a las reglas de confidencialidad aplicables.': 'SMTinel · internal quality document. Protect according to applicable confidentiality rules.',
    'Volver al inicio': 'Back to top',
    'Excel / evidencias recuperadas primero.': 'Recovered evidence first.',
    'Los archivos incrustados del PowerPoint se muestran antes de las láminas para que en móvil no parezcan desaparecidos.': 'Embedded PowerPoint files are shown before the slides so they do not look missing on mobile.',
    'Ir a Excel / adjuntos': 'Go to evidence / attachments',
    'evidencia adjunta': 'attached evidence',
    'archivo(s) recuperado(s)': 'recovered file(s)',
    'registros': 'records',
    'diapositiva(s)': 'slide(s)',
}
for old, new in replacements.items():
    text = text.replace(old, new)

text = re.sub(r'(<div class="brand-title">).*?(</div>)', r'\1SMTinel · 8D Handoff\2', text, count=1, flags=re.S)
text = re.sub(r'(<div class="brand-sub">).*?(</div>)', r'\1Trace · Monitor · Protect · Offline evidence\2', text, count=1, flags=re.S)
text = text.replace('<div class="logo">8D</div>', f'<div class="logo" role="img" aria-label="SMTinel"><img src="{icon_uri}" alt=""/></div>')

# Light executive handoff skin. This intentionally borrows the visual language of
# SMTinel shift handoff reports: olive rail, operational intelligence band,
# quiet cards and wine only for evidence/action accents.
css = r'''
/* smtinel-8d-english-handoff-theme-v2 | report-identity-v2 */
:root{
  color-scheme:light;
  --bg:#eef4ea;
  --paper:#ffffff;
  --cream:#f7faf4;
  --rail:#f3f7ef;
  --olive:#2f4f2b;
  --olive-deep:#20372d;
  --olive-soft:#dfead9;
  --mint:#f2f8ef;
  --wine:#9c2443;
  --blue:#0f3f86;
  --line:#d8e4d3;
  --line-strong:#b9cbb0;
  --ink:#17231d;
  --muted:#61746a;
  --shadow:0 22px 55px rgba(31,49,39,.13);
  --shadow-soft:0 10px 28px rgba(31,49,39,.08);
}
html,body{background:var(--bg)!important;color:var(--ink)!important;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;}
.app{background:linear-gradient(180deg,#fbfcf8 0,#eef4ea 100%)!important;color:var(--ink)!important;}
.app{grid-template-rows:64px minmax(0,1fr)!important;}
.top{height:64px!important;min-height:64px!important;background:rgba(255,255,255,.97)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 28px rgba(31,49,39,.09)!important;backdrop-filter:saturate(1.25) blur(10px)!important;padding:6px 16px!important;gap:10px!important;}
.top:after{content:"TRACE · MONITOR · PROTECT";margin-left:auto;color:#26372f!important;font-size:10px!important;font-weight:900!important;letter-spacing:.32em!important;white-space:nowrap!important;opacity:.9!important;}
.logo{width:42px!important;height:42px!important;border-radius:16px!important;background:linear-gradient(145deg,#20372d,#7fa26a)!important;color:#fff!important;box-shadow:0 16px 30px rgba(38,69,49,.22)!important;font-weight:950!important;letter-spacing:-1.3px!important;border:1px solid rgba(255,255,255,.55)!important;}
.logo:before{content:"";position:absolute;inset:7px;border-radius:12px;border:1px solid rgba(255,255,255,.32);pointer-events:none;}.logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block;}
.brand-title{color:var(--ink)!important;font-size:19px!important;font-weight:950!important;letter-spacing:-.8px!important;}
.brand-sub{color:var(--muted)!important;font-size:12px!important;letter-spacing:.01em!important;}
.mini{background:#f4f8ef!important;color:#455c50!important;border:1px solid #d3dfce!important;border-radius:999px!important;font-weight:850!important;box-shadow:0 5px 15px rgba(31,49,39,.05)!important;}
.mini.em{background:#fff4e3!important;color:#8c5d08!important;border-color:#ecd6a5!important;}
.btn{background:#fff!important;border:1px solid #cfdcca!important;color:#24372e!important;border-radius:13px!important;box-shadow:0 6px 16px rgba(31,49,39,.06)!important;font-weight:850!important;}
.btn:hover{background:#f3f8ef!important;border-color:#b6c9ad!important;}
.btn.primary{background:var(--wine)!important;border-color:var(--wine)!important;color:#fff!important;box-shadow:0 12px 26px rgba(156,36,67,.20)!important;}
.main{background:transparent!important;}
.sidebar{background:linear-gradient(180deg,#fbfcf8 0,#eef5ea 100%)!important;border-right:1px solid var(--line)!important;box-shadow:8px 0 28px rgba(31,49,39,.06)!important;}
.sidebar:before{display:none!important;}
.shead{background:#fbfcf8!important;border-bottom:1px solid var(--line)!important;padding-top:16px!important;}
.shead h2{color:#1b2c24!important;font-weight:950!important;letter-spacing:-.35px!important;}
.search{background:#fff!important;color:#1b2c24!important;border:1px solid #cfdcca!important;border-radius:14px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;}
.search::placeholder{color:#899990!important;}
.group-title{color:var(--wine)!important;letter-spacing:2.6px!important;font-size:11px!important;font-weight:950!important;}
.nav-item{color:#2d4439!important;border-radius:16px!important;border:1px solid transparent!important;margin:4px 10px!important;}
.nav-item:hover{background:#eef5ea!important;border-color:#d8e4d3!important;}
.nav-item.active{background:#fff!important;border-color:#dc9bae!important;box-shadow:0 12px 25px rgba(156,36,67,.11)!important;color:#17231d!important;}
.thumb{border-color:#d5ded2!important;border-radius:11px!important;box-shadow:0 9px 20px rgba(29,52,42,.10)!important;}
.nav-no{color:var(--wine)!important;font-weight:950!important;}
.nav-sub{color:#728278!important;}
.viewer{background:radial-gradient(circle at 50% 0,#ffffff 0,#f5f9f2 48%,#e6efdf 100%)!important;}
.viewer-header{background:rgba(255,255,255,.88)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(31,49,39,.06)!important;position:relative!important;padding-bottom:12px!important;}
.viewer-header:after{display:none!important;content:none!important;}
.page-title{color:#17231d!important;font-size:22px!important;font-weight:950!important;letter-spacing:-.45px!important;}
.page-path,.counter{color:#64756c!important;}
.stage{background:linear-gradient(180deg,#f8fbf5,#eef5ea)!important;padding:24px!important;}
.frame{border-radius:18px!important;box-shadow:0 24px 60px rgba(28,43,35,.18),0 0 0 1px rgba(130,153,121,.25)!important;overflow:hidden!important;background:#fff!important;}
.hotspot{border:2px dashed #d99ab0!important;background:rgba(156,36,67,.08)!important;color:#7b1935!important;}
.hotspot:hover{background:rgba(156,36,67,.18)!important;}
.hotspot .glow{background:var(--wine)!important;color:white!important;border-radius:9px!important;box-shadow:0 8px 18px rgba(156,36,67,.22)!important;font-weight:900!important;}
.stage-info{background:#ffffff!important;border-top:1px solid var(--line)!important;color:#697a71!important;}
.stage-info strong{color:var(--wine)!important;}
.footer{background:rgba(255,255,255,.94)!important;border-top:1px solid var(--line)!important;box-shadow:0 -8px 24px rgba(28,43,35,.07)!important;}
.foot-count,.zoom-value{color:#20372d!important;font-weight:900!important;}
.separator{background:#d8e4d3!important;}
.drawer{background:linear-gradient(180deg,#fbfcf8,#eef5ea)!important;border-left:1px solid var(--line)!important;color:#17231d!important;box-shadow:-28px 0 55px rgba(28,43,35,.16)!important;}
.drawer-head{background:#ffffff!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(31,49,39,.06)!important;}
.drawer-head h2{color:#17231d!important;font-weight:950!important;}
.drawer-head p{color:#6d7e74!important;}
.evidence-card{background:#ffffff!important;border:1px solid #d8e4d3!important;border-radius:20px!important;box-shadow:var(--shadow)!important;}
.evidence-title{color:#17231d!important;font-weight:950!important;}
.evidence-sub,.fade,.sheet-foot,.disclaimer{color:#66756d!important;}
.sheet-tabs button{background:#f4f8f0!important;color:#385045!important;border:1px solid #d2dfcd!important;border-radius:12px!important;}
.sheet-tabs button.active{background:var(--wine)!important;color:#fff!important;border-color:var(--wine)!important;}
.sheet-tools input{background:#fff!important;color:#17231d!important;border:1px solid #cfdcca!important;border-radius:12px!important;}
.sheet-wrap{border:1px solid #d3dfcf!important;background:#fff!important;border-radius:14px!important;}
.sheet-table td,.sheet-table th{border-bottom:1px solid #e3eadf!important;color:#26382f!important;}
.sheet-table th{background:#eef5ea!important;color:#17231d!important;}
.sheet-table tr:nth-child(even){background:#fbfcf8!important;}
.notes{background:#f4f8f0!important;color:#2c3c33!important;border:1px solid #d8e4d3!important;border-radius:14px!important;}
.empty{color:#6f8076!important;border-color:#cbd8c6!important;background:#fbfcf8!important;}
.plain-link{color:#20664b!important;}
.right-overlay{background:rgba(20,30,24,.32)!important;backdrop-filter:blur(4px)!important;}
#safariFallback{background:linear-gradient(180deg,#fbfcf8 0,#edf4eb 100%)!important;color:#17231d!important;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;}
#safariFallback .sf-top{background:rgba(255,255,255,.96)!important;border-bottom:1px solid #dbe5d7!important;color:#17231d!important;box-shadow:0 8px 24px rgba(31,49,39,.09)!important;}
#safariFallback .sf-top strong{color:#17231d!important;font-weight:950!important;}
#safariFallback .sf-top small{color:#66756d!important;}
#safariFallback .sf-top a,#safariFallback .sf-assets .sf-download,#safariFallback .sf-evidence-primer a{background:var(--wine)!important;border:1px solid var(--wine)!important;color:white!important;border-radius:12px!important;}
#safariFallback .sf-info{background:#eef5ea!important;color:#42574c!important;border-bottom:1px solid #dbe5d7!important;}
#safariFallback .sf-note,#safariFallback .sf-warning{color:#65766d!important;}
#safariFallback .sf-index,#safariFallback .sf-slide,#safariFallback .sf-assets,#safariFallback .sf-inline-evidence,#safariFallback .sf-assets details{background:#ffffff!important;border:1px solid #dbe5d7!important;color:#17231d!important;border-radius:18px!important;box-shadow:var(--shadow)!important;}
#safariFallback .sf-index summary,#safariFallback .sf-assets summary,#safariFallback .sf-tools summary{color:var(--wine)!important;font-weight:950!important;}
#safariFallback .sf-index-grid a{background:#f7faf5!important;border:1px solid #dce8d7!important;color:#26382f!important;border-radius:12px!important;}
#safariFallback .sf-index-grid .sf-evidence-link{background:#fff1f5!important;color:var(--wine)!important;border-color:#edbdca!important;}
#safariFallback .sf-slide-head{background:#ffffff!important;border-bottom:1px solid #edf1ea!important;}
#safariFallback .sf-slide-head strong{color:#17231d!important;}
#safariFallback .sf-slide-head small{color:#6a7a72!important;}
#safariFallback .sf-pager a,#safariFallback .sf-pager span{background:#f4f8f0!important;border:1px solid #d2dfcd!important;color:#17231d!important;border-radius:12px!important;}
#safariFallback .sf-picture{background:#fff!important;}
#safariFallback .sf-tools pre{background:#f4f8f0!important;color:#2c3c33!important;border:1px solid #d8e4d3!important;border-radius:14px!important;}
#safariFallback .sf-evidence-primer{background:#fff6f8!important;color:#7a1732!important;border:1px solid #edbdca!important;border-radius:18px!important;box-shadow:var(--shadow)!important;}
#safariFallback .sf-table-overflow{background:#fff!important;border:1px solid #d4e0d0!important;border-radius:14px!important;}
#safariFallback .sf-table-overflow th{background:#eef5ea!important;color:#17231d!important;}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{border-bottom:1px solid #e3eadf!important;color:#26382f!important;}
@media(max-width:900px){.top:after{display:none!important}.viewer-header{padding-bottom:12px!important}.viewer-header:after{display:none!important}.stage{padding:10px!important}.brand-title{font-size:16px!important}.brand-sub{font-size:10px!important}.logo{width:40px!important;height:40px!important}.drawer{width:100%!important}}
@media(max-width:730px){.app{grid-template-rows:54px minmax(0,1fr)!important}.top{height:54px!important;min-height:54px!important;padding:4px 8px!important}.logo{width:36px!important;height:36px!important;}.sidebar:before{display:none!important}.stage{padding:8px 4px!important}.footer{min-height:54px!important;padding-bottom:max(7px,env(safe-area-inset-bottom))!important}#safariFallback .sf-slide{border-radius:16px!important;margin:10px 8px 16px!important}#safariFallback .sf-assets,#safariFallback .sf-evidence-primer,#safariFallback .sf-index{margin:8px!important;border-radius:16px!important}}
@media print{body{background:white!important;color:#111!important}.top,.sidebar,.footer,.drawer{display:none!important}.stage{padding:0!important;background:#fff!important}.frame{box-shadow:none!important;border-radius:0!important}}
'''

if '</style></head>' in text:
    text = text.replace('</style></head>', css + '\n</style></head>', 1)
else:
    text = text.replace('</head>', '<style>' + css + '</style></head>', 1)

path.write_text(text, encoding='utf-8')
print('English Handoff theme applied:', path)

