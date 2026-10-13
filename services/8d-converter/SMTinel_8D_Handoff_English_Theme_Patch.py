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
import base64

if len(sys.argv) < 2:
    print('Usage: python SMTinel_8D_Handoff_English_Theme_Patch.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
marker = 'smtinel-8d-english-handoff-theme-v2'
if marker in text:
    print('English Handoff theme already present:', path)
    raise SystemExit(0)

# Embed the official shield. One portable asset for the header and favicon.
icon_file = Path(__file__).resolve().parent / 'smtinel_favicon.png'
icon_uri = 'data:image/png;base64,' + base64.b64encode(icon_file.read_bytes()).decode('ascii')

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
    f'<link rel="icon" type="image/png" href="{icon_uri}"/>\n'
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

# Include the same embedded shield in the script-free mobile header.
text = text.replace('<header class="sf-top"><div>',
    f'<header class="sf-top"><div class="sf-brand"><img class="sf-logo" src="{icon_uri}" alt="SMTinel"><div>', 1)
text = text.replace('</small></div><a href="#sf-evidence">', '</small></div></div><a href="#sf-evidence">', 1)

# Shainin-inspired red, white and charcoal viewer chrome.
# The original PowerPoint slide images and the official shield keep their colors.
css = r'''
/* smtinel-8d-english-handoff-theme-v2 | smtinel-8d-shainin-brand-v1 */
:root{
  color-scheme:light;
  --bg:#f5f5f6;
  --paper:#ffffff;
  --cream:#fafafa;
  --rail:#f5f5f6;
  --olive:#c8102e;
  --olive-deep:#202124;
  --olive-soft:#e9eaed;
  --mint:#f5f5f6;
  --wine:#c8102e;
  --blue:#c8102e;
  --line:#dcdde1;
  --line-strong:#b7bac2;
  --ink:#202124;
  --muted:#61656d;
  --shadow:0 22px 55px rgba(32,33,36,.13);
  --shadow-soft:0 10px 28px rgba(32,33,36,.08);
}
html,body{background:var(--bg)!important;color:var(--ink)!important;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;}
.app{background:linear-gradient(180deg,#fafafa 0,#f5f5f6 100%)!important;color:var(--ink)!important;}
.app{grid-template-rows:64px minmax(0,1fr)!important;}
.top{border-top:3px solid var(--wine)!important;height:64px!important;min-height:64px!important;background:rgba(255,255,255,.97)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 28px rgba(32,33,36,.09)!important;backdrop-filter:saturate(1.25) blur(10px)!important;padding:6px 16px!important;gap:10px!important;}
.top:after{content:"TRACE · MONITOR · PROTECT";margin-left:auto;color:#202124!important;font-size:10px!important;font-weight:900!important;letter-spacing:.32em!important;white-space:nowrap!important;opacity:.9!important;}
.logo{width:42px!important;height:42px!important;flex-shrink:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;border:0!important;}
.logo:before{content:none!important}.logo img{width:100%;height:100%;object-fit:contain;border-radius:inherit;display:block;}
.brand-title{color:var(--ink)!important;font-size:19px!important;font-weight:950!important;letter-spacing:-.8px!important;}
.brand-sub{color:var(--muted)!important;font-size:12px!important;letter-spacing:.01em!important;}
.mini{background:#fafafa!important;color:#41454c!important;border:1px solid #dcdde1!important;border-radius:999px!important;font-weight:850!important;box-shadow:0 5px 15px rgba(32,33,36,.05)!important;}
.mini.em{background:#fff1f3!important;color:#991029!important;border-color:#efb4bf!important;}
.btn{background:#fff!important;border:1px solid #dcdde1!important;color:#202124!important;border-radius:13px!important;box-shadow:0 6px 16px rgba(32,33,36,.06)!important;font-weight:850!important;}
.btn:hover{background:#fafafa!important;border-color:#b7bac2!important;}
.btn.primary{background:var(--wine)!important;border-color:var(--wine)!important;color:#fff!important;box-shadow:0 12px 26px rgba(200,16,46,.20)!important;}
.main{background:transparent!important;}
.sidebar{background:linear-gradient(180deg,#fafafa 0,#f5f5f6 100%)!important;border-right:1px solid var(--line)!important;box-shadow:8px 0 28px rgba(32,33,36,.06)!important;}
.sidebar:before{display:none!important;}
.shead{background:#fafafa!important;border-bottom:1px solid var(--line)!important;padding-top:16px!important;}
.shead h2{color:#202124!important;font-weight:950!important;letter-spacing:-.35px!important;}
.search{background:#fff!important;color:#202124!important;border:1px solid #dcdde1!important;border-radius:14px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;}
.search::placeholder{color:#767b84!important;}
.group-title{color:var(--wine)!important;letter-spacing:2.6px!important;font-size:11px!important;font-weight:950!important;}
.nav-item{color:#41454c!important;border-radius:16px!important;border:1px solid transparent!important;margin:4px 0!important;}
.nav-item:hover{background:#f5f5f6!important;border-color:#dcdde1!important;}
.nav-item.active{background:#fff1f3!important;border-color:#efb4bf!important;box-shadow:0 12px 25px rgba(200,16,46,.11)!important;color:#202124!important;}
.thumb{border-color:#dcdde1!important;border-radius:11px!important;box-shadow:0 9px 20px rgba(32,33,36,.10)!important;}
.nav-no{color:var(--wine)!important;font-weight:950!important;}
.nav-sub{color:#61656d!important;}
.viewer{background:radial-gradient(circle at 50% 0,#ffffff 0,#f5f5f6 48%,#e9eaed 100%)!important;}
.viewer-header{background:rgba(255,255,255,.88)!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(32,33,36,.06)!important;position:relative!important;padding-bottom:12px!important;}
.viewer-header:after{display:none!important;content:none!important;}
.page-title{color:#202124!important;font-size:22px!important;font-weight:950!important;letter-spacing:-.45px!important;}
.page-path,.counter{color:#61656d!important;}
.stage{background:linear-gradient(180deg,#fafafa,#f5f5f6)!important;padding:24px!important;}
.frame{border-radius:18px!important;box-shadow:0 24px 60px rgba(32,33,36,.18),0 0 0 1px rgba(32,33,36,.25)!important;overflow:hidden!important;background:#fff!important;}
.hotspot{border:2px dashed #efb4bf!important;background:rgba(200,16,46,.08)!important;color:#991029!important;}
.hotspot:hover{background:rgba(200,16,46,.18)!important;}
.hotspot .glow{background:var(--wine)!important;color:white!important;border-radius:9px!important;box-shadow:0 8px 18px rgba(200,16,46,.22)!important;font-weight:900!important;}
.stage-info{background:#ffffff!important;border-top:1px solid var(--line)!important;color:#61656d!important;}
.stage-info strong{color:var(--wine)!important;}
.footer{background:rgba(255,255,255,.94)!important;border-top:1px solid var(--line)!important;box-shadow:0 -8px 24px rgba(32,33,36,.07)!important;}
.foot-count,.zoom-value{color:#202124!important;font-weight:900!important;}
.separator{background:#dcdde1!important;}
.drawer{background:linear-gradient(180deg,#fafafa,#f5f5f6)!important;border-left:1px solid var(--line)!important;color:#202124!important;box-shadow:-28px 0 55px rgba(32,33,36,.16)!important;}
.drawer-head{background:#ffffff!important;border-bottom:1px solid var(--line)!important;box-shadow:0 8px 22px rgba(32,33,36,.06)!important;}
.drawer-head h2{color:#202124!important;font-weight:950!important;}
.drawer-head p{color:#61656d!important;}
.evidence-card{background:#ffffff!important;border:1px solid #dcdde1!important;border-radius:20px!important;box-shadow:var(--shadow)!important;}
.evidence-title{color:#202124!important;font-weight:950!important;}
.evidence-sub,.fade,.sheet-foot,.disclaimer{color:#61656d!important;}
.sheet-tabs button{background:#fafafa!important;color:#41454c!important;border:1px solid #dcdde1!important;border-radius:12px!important;}
.sheet-tabs button.active{background:var(--wine)!important;color:#fff!important;border-color:var(--wine)!important;}
.sheet-tools input{background:#fff!important;color:#202124!important;border:1px solid #dcdde1!important;border-radius:12px!important;}
.sheet-wrap{border:1px solid #dcdde1!important;background:#fff!important;border-radius:14px!important;}
.sheet-table td,.sheet-table th{border-bottom:1px solid #dcdde1!important;color:#202124!important;}
.sheet-table th{background:#f5f5f6!important;color:#202124!important;}
.sheet-table tr:nth-child(even){background:#fafafa!important;}
.notes{background:#fafafa!important;color:#41454c!important;border:1px solid #dcdde1!important;border-radius:14px!important;}
.empty{color:#61656d!important;border-color:#dcdde1!important;background:#fafafa!important;}
.plain-link{color:#c8102e!important;}
.right-overlay{background:rgba(32,33,36,.32)!important;backdrop-filter:blur(4px)!important;}
#safariFallback{background:linear-gradient(180deg,#fafafa 0,#f5f5f6 100%)!important;color:#202124!important;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;}
#safariFallback .sf-top{background:rgba(255,255,255,.96)!important;border-bottom:1px solid #dcdde1!important;color:#202124!important;box-shadow:0 8px 24px rgba(32,33,36,.09)!important;}
#safariFallback .sf-top strong{color:#202124!important;font-weight:950!important;}
#safariFallback .sf-top small{color:#61656d!important;}
#safariFallback .sf-top a,#safariFallback .sf-assets .sf-download,#safariFallback .sf-evidence-primer a{background:var(--wine)!important;border:1px solid var(--wine)!important;color:white!important;border-radius:12px!important;}
#safariFallback .sf-info{background:#f5f5f6!important;color:#41454c!important;border-bottom:1px solid #dcdde1!important;}
#safariFallback .sf-note,#safariFallback .sf-warning{color:#61656d!important;}
#safariFallback .sf-index,#safariFallback .sf-slide,#safariFallback .sf-assets,#safariFallback .sf-inline-evidence,#safariFallback .sf-assets details{background:#ffffff!important;border:1px solid #dcdde1!important;color:#202124!important;border-radius:18px!important;box-shadow:var(--shadow)!important;}
#safariFallback .sf-index summary,#safariFallback .sf-assets summary,#safariFallback .sf-tools summary{color:var(--wine)!important;font-weight:950!important;}
#safariFallback .sf-index-grid a{background:#fafafa!important;border:1px solid #dcdde1!important;color:#202124!important;border-radius:12px!important;}
#safariFallback .sf-index-grid .sf-evidence-link{background:#fff1f3!important;color:var(--wine)!important;border-color:#efb4bf!important;}
#safariFallback .sf-slide-head{background:#ffffff!important;border-bottom:1px solid #dcdde1!important;}
#safariFallback .sf-slide-head strong{color:#202124!important;}
#safariFallback .sf-slide-head small{color:#61656d!important;}
#safariFallback .sf-pager a,#safariFallback .sf-pager span{background:#fafafa!important;border:1px solid #dcdde1!important;color:#202124!important;border-radius:12px!important;}
#safariFallback .sf-picture{background:#fff!important;}
#safariFallback .sf-tools pre{background:#fafafa!important;color:#41454c!important;border:1px solid #dcdde1!important;border-radius:14px!important;}
#safariFallback .sf-evidence-primer{background:#fff1f3!important;color:#991029!important;border:1px solid #efb4bf!important;border-radius:18px!important;box-shadow:var(--shadow)!important;}
#safariFallback .sf-table-overflow{background:#fff!important;border:1px solid #dcdde1!important;border-radius:14px!important;}
#safariFallback .sf-table-overflow th{background:#f5f5f6!important;color:#202124!important;}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{border-bottom:1px solid #dcdde1!important;color:#202124!important;}
@media(max-width:900px){.top:after{display:none!important}.viewer-header{padding-bottom:12px!important}.viewer-header:after{display:none!important}.stage{padding:10px!important}.brand-title{font-size:16px!important}.brand-sub{font-size:10px!important}.logo{width:40px!important;height:40px!important}.drawer{width:100%!important}}
@media(max-width:730px){.app{grid-template-rows:54px minmax(0,1fr)!important}.top{height:54px!important;min-height:54px!important;padding:4px 8px!important}.logo{width:36px!important;height:36px!important;}.sidebar:before{display:none!important}.stage{padding:8px 4px!important}.footer{min-height:54px!important;padding-bottom:max(7px,env(safe-area-inset-bottom))!important}#safariFallback .sf-slide{border-radius:16px!important;margin:10px 8px 16px!important}#safariFallback .sf-assets,#safariFallback .sf-evidence-primer,#safariFallback .sf-index{margin:8px!important;border-radius:16px!important}}
@media print{body{background:white!important;color:#111!important}.top,.sidebar,.footer,.drawer{display:none!important}.stage{padding:0!important;background:#fff!important}.frame{box-shadow:none!important;border-radius:0!important}}

#safariFallback .sf-brand{display:flex;align-items:center;gap:9px;min-width:0}
#safariFallback .sf-logo{width:36px;height:36px;object-fit:contain;flex-shrink:0}
#safariFallback .sf-top{border-top:3px solid var(--wine)!important}
.mail-card,.mail-preview{background:var(--paper)!important;border-color:var(--line)!important;color:var(--ink)!important}
.mail-title,.mail-grid span{color:var(--ink)!important}
.mail-meta,.mail-small,.mail-pdf-note,.mail-evidence-count{color:var(--muted)!important}
.mail-head,.mail-actions,.mail-action-row{border-color:var(--line)!important}
.mail-body,.mail-raw{background:var(--cream)!important;border-color:var(--line)!important;color:var(--ink)!important}
.mail-grid b,.mail-action-row.header,.mail-source-slide,.mail-action-row span:nth-child(n+3)::before{color:var(--wine)!important}
.mail-pill,.mail-warn,.mail-attach{background:#fff1f3!important;border-color:#efb4bf!important;color:#991029!important}
.mail-tabbar button,.mail-open-btn.secondary{background:var(--paper)!important;border-color:var(--line)!important;color:var(--ink)!important}
.mail-tabbar button.active,.mail-open-btn{background:var(--wine)!important;border-color:var(--wine)!important;color:#fff!important}
.mail-missing{color:#8c5300!important}
.btn:focus-visible,.nav-item:focus-visible,.search:focus-visible{outline:3px solid var(--wine)!important;outline-offset:2px!important}
'''

if '</style></head>' in text:
    text = text.replace('</style></head>', css + '\n</style></head>', 1)
else:
    text = text.replace('</head>', '<style>' + css + '</style></head>', 1)

path.write_text(text, encoding='utf-8')
print('English Handoff theme applied:', path)

