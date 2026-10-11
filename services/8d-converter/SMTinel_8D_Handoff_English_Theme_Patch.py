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
marker = 'smtinel-8d-english-handoff-theme-v1'
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
icon_uri = 'data:image/svg+xml,' + quote(svg_icon, safe='/:;,#%?&=+@!$()*[]')

# Language, document metadata and embedded icon.
text = re.sub(r'<html\s+lang="[^"]*"', '<html lang="en"', text, count=1)
text = text.replace('SMTinel · 8D Interactive', 'SMTinel · 8D Handoff')
text = re.sub(
    r'<meta name="description" content="[^"]*"\s*/>',
    '<meta name="description" content="Portable SMTinel 8D handoff package. Slides, embedded evidence, links and Excel attachments are preserved offline."/>',
    text,
    count=1,
)
text = re.sub(r'<link\s+rel="(?:icon|apple-touch-icon)"[^>]*>', '', text, flags=re.I)
icon_links = (
    f'<link rel="icon" type="image/svg+xml" href="{icon_uri}"/>\n'
    f'<link rel="apple-touch-icon" href="{icon_uri}"/>'
)
if '<meta name="description"' in text:
    text = text.replace('<meta name="description"', icon_links + '\n<meta name="description"', 1)
else:
    text = text.replace('</title>', '</title>\n' + icon_links, 1)

# UI copy. The exported PowerPoint slide images remain untouched; only the viewer chrome changes.
replacements = {
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
    'Excel / evidencias recuperadas primero.': 'Excel / recovered evidence first.',
    'Los archivos incrustados del PowerPoint se muestran antes de las láminas para que en móvil no parezcan desaparecidos.': 'Embedded PowerPoint files are shown before the slides so they do not look missing on mobile.',
    'Ir a Excel / adjuntos': 'Go to Excel / attachments',
    'evidencia adjunta': 'attached evidence',
    'archivo(s) recuperado(s)': 'recovered file(s)',
    'registros': 'records',
    'diapositiva(s)': 'slide(s)',
}
for old, new in replacements.items():
    text = text.replace(old, new)

# Light, executive handoff skin. Overrides the dark viewer after previous patches.
css = r'''
/* smtinel-8d-english-handoff-theme-v1
   Clean executive handoff skin: light, autonomous, SMTinel-branded. */
:root{
  color-scheme:light;
  --bg:#f4f7f1;
  --sidebar:#f8faf5;
  --top:#ffffff;
  --panel:#ffffff;
  --line:#dbe5d7;
  --muted:#66756d;
  --accent:#9c2443;
  --accent2:#6e8a57;
  --white:#17231d;
  --handoff-ink:#17231d;
  --handoff-soft:#eef4ea;
  --handoff-card:#ffffff;
  --handoff-shadow:0 18px 45px rgba(31,49,39,.12);
}
html,body{background:var(--bg)!important;color:var(--handoff-ink)!important;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;}
.app{background:linear-gradient(180deg,#fbfcf8 0,#edf4eb 100%)!important;}
.top{background:rgba(255,255,255,.96)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 6px 24px rgba(28,43,35,.08)!important;backdrop-filter:saturate(1.25) blur(10px);}
.logo{background:linear-gradient(135deg,#1d342a,#84a56c)!important;color:#fff!important;border-radius:14px!important;box-shadow:0 10px 22px rgba(40,69,54,.20)!important;letter-spacing:-1px!important;}
.brand-title{color:#16261f!important;font-weight:900!important;letter-spacing:-.55px!important;}
.brand-sub{color:#6a7a72!important;}
.mini{background:#f4f7f1!important;color:#51645a!important;border-color:#d8e2d4!important;font-weight:750!important;}
.mini.em{background:#fff4e1!important;color:#8c5f13!important;border-color:#ebd4a1!important;}
.btn{background:#ffffff!important;border:1px solid #cfdbca!important;color:#26362d!important;border-radius:12px!important;box-shadow:0 5px 15px rgba(28,43,35,.06)!important;font-weight:780!important;}
.btn:hover{background:#f3f8ef!important;border-color:#b7c9ae!important;}
.btn.primary{background:#9c2443!important;border-color:#9c2443!important;color:#fff!important;box-shadow:0 10px 22px rgba(156,36,67,.18)!important;}
.main{background:transparent!important;}
.sidebar{background:linear-gradient(180deg,#fbfcf8,#f1f6ed)!important;border-right:1px solid var(--line)!important;}
.shead{background:#fbfcf8!important;border-bottom:1px solid var(--line)!important;}
.shead h2{color:#1b2c24!important;font-weight:900!important;letter-spacing:-.25px!important;}
.search{background:#fff!important;color:#1b2c24!important;border:1px solid #cfdcca!important;border-radius:14px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;}
.search::placeholder{color:#8a9a91!important;}
.group-title{color:#9c2443!important;letter-spacing:1.55px!important;}
.nav-item{color:#30443a!important;border-radius:14px!important;}
.nav-item:hover{background:#eef5ea!important;}
.nav-item.active{background:#fff!important;border-color:#d994aa!important;box-shadow:0 10px 25px rgba(156,36,67,.10)!important;color:#17231d!important;}
.thumb{border-color:#d5ded2!important;border-radius:10px!important;box-shadow:0 8px 20px rgba(29,52,42,.09)!important;}
.nav-no{color:#9c2443!important;}
.nav-sub{color:#728278!important;}
.viewer{background:radial-gradient(circle at 50% 0,#ffffff 0,#f4f8f0 42%,#e8f0e3 100%)!important;}
.viewer-header{background:rgba(255,255,255,.86)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(31,49,39,.06)!important;}
.page-title{color:#17231d!important;font-weight:900!important;}
.page-path,.counter{color:#64756c!important;}
.stage{background:linear-gradient(180deg,#f4f8f0,#eef5eb)!important;}
.frame{border-radius:16px!important;box-shadow:0 22px 55px rgba(28,43,35,.18),0 0 0 1px rgba(130,153,121,.22)!important;overflow:hidden!important;background:#fff!important;}
.hotspot{border-color:#d99ab0!important;background:rgba(156,36,67,.08)!important;color:#7b1935!important;}
.hotspot:hover{background:rgba(156,36,67,.18)!important;}
.hotspot .glow{background:#9c2443!important;color:white!important;border-radius:9px!important;box-shadow:0 8px 18px rgba(156,36,67,.22)!important;}
.stage-info{background:#ffffff!important;border-top:1px solid var(--line)!important;color:#697a71!important;}
.stage-info strong{color:#9c2443!important;}
.footer{background:rgba(255,255,255,.92)!important;border-top:1px solid var(--line)!important;box-shadow:0 -8px 24px rgba(28,43,35,.07)!important;}
.foot-count,.zoom-value{color:#20372d!important;}
.separator{background:#d8e4d3!important;}
.drawer{background:#fbfcf8!important;border-left:1px solid var(--line)!important;color:#17231d!important;box-shadow:-28px 0 55px rgba(28,43,35,.16)!important;}
.drawer-head{background:#ffffff!important;border-bottom:1px solid var(--line)!important;}
.drawer-head h2{color:#17231d!important;font-weight:900!important;}
.drawer-head p{color:#6d7e74!important;}
.evidence-card{background:#ffffff!important;border:1px solid #d8e4d3!important;border-radius:18px!important;box-shadow:var(--handoff-shadow)!important;}
.evidence-title{color:#17231d!important;}
.evidence-sub,.fade,.sheet-foot,.disclaimer{color:#66756d!important;}
.sheet-tabs button{background:#f4f8f0!important;color:#385045!important;border:1px solid #d2dfcd!important;border-radius:12px!important;}
.sheet-tabs button.active{background:#9c2443!important;color:#fff!important;border-color:#9c2443!important;}
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
#safariFallback .sf-top strong{color:#17231d!important;font-weight:900!important;}
#safariFallback .sf-top small{color:#66756d!important;}
#safariFallback .sf-top a,#safariFallback .sf-assets .sf-download,#safariFallback .sf-evidence-primer a{background:#9c2443!important;border:1px solid #9c2443!important;color:white!important;border-radius:12px!important;}
#safariFallback .sf-info{background:#eef5ea!important;color:#42574c!important;border-bottom:1px solid #dbe5d7!important;}
#safariFallback .sf-note,#safariFallback .sf-warning{color:#65766d!important;}
#safariFallback .sf-index,#safariFallback .sf-slide,#safariFallback .sf-assets,#safariFallback .sf-inline-evidence,#safariFallback .sf-assets details{background:#ffffff!important;border:1px solid #dbe5d7!important;color:#17231d!important;border-radius:18px!important;box-shadow:var(--handoff-shadow)!important;}
#safariFallback .sf-index summary,#safariFallback .sf-assets summary,#safariFallback .sf-tools summary{color:#9c2443!important;font-weight:900!important;}
#safariFallback .sf-index-grid a{background:#f7faf5!important;border:1px solid #dce8d7!important;color:#26382f!important;border-radius:12px!important;}
#safariFallback .sf-index-grid .sf-evidence-link{background:#fff1f5!important;color:#9c2443!important;border-color:#edbdca!important;}
#safariFallback .sf-slide-head{background:#ffffff!important;border-bottom:1px solid #edf1ea!important;}
#safariFallback .sf-slide-head strong{color:#17231d!important;}
#safariFallback .sf-slide-head small{color:#6a7a72!important;}
#safariFallback .sf-pager a,#safariFallback .sf-pager span{background:#f4f8f0!important;border:1px solid #d2dfcd!important;color:#17231d!important;border-radius:12px!important;}
#safariFallback .sf-picture{background:#fff!important;}
#safariFallback .sf-tools pre{background:#f4f8f0!important;color:#2c3c33!important;border:1px solid #d8e4d3!important;border-radius:14px!important;}
#safariFallback .sf-evidence-primer{background:#fff6f8!important;color:#7a1732!important;border:1px solid #edbdca!important;border-radius:18px!important;box-shadow:var(--handoff-shadow)!important;}
#safariFallback .sf-table-overflow{background:#fff!important;border:1px solid #d4e0d0!important;border-radius:14px!important;}
#safariFallback .sf-table-overflow th{background:#eef5ea!important;color:#17231d!important;}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{border-bottom:1px solid #e3eadf!important;color:#26382f!important;}
@media(max-width:730px){
  .app{grid-template-rows:56px minmax(0,1fr)!important;}
  .top{padding:0 9px!important;gap:7px!important;}
  .brand-title{font-size:13px!important;}
  .brand-sub{font-size:9px!important;}
  .logo{width:32px!important;height:32px!important;border-radius:11px!important;font-size:13px!important;}
  .viewer-header{background:#fff!important;}
  .stage{padding:10px 5px!important;}
  .footer{min-height:54px!important;padding-bottom:max(7px,env(safe-area-inset-bottom))!important;}
  .drawer{width:100%!important;}
  #safariFallback .sf-slide{border-radius:16px!important;margin:10px 8px 16px!important;}
  #safariFallback .sf-assets,#safariFallback .sf-evidence-primer,#safariFallback .sf-index{margin:8px!important;border-radius:16px!important;}
}
@media print{
  body{background:white!important;color:#111!important;}
}
'''

if '</style></head>' in text:
    text = text.replace('</style></head>', css + '\n</style></head>', 1)
else:
    text = text.replace('</head>', '<style>' + css + '</style></head>', 1)

path.write_text(text, encoding='utf-8')
print('English Handoff theme applied:', path)
