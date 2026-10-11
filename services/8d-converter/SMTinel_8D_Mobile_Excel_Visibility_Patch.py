#!/usr/bin/env python3
"""Make embedded Excel evidence visible early in the mobile/script-free 8D fallback.

The normal interactive drawer is unchanged. This only reorders and styles the
static fallback used by iPhone Files/QuickLook and other restricted viewers.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('Uso: python SMTinel_8D_Mobile_Excel_Visibility_Patch.py reporte.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
marker = 'smtinel-mobile-excel-evidence-v1'
if marker in text:
    print('Mobile Excel evidence patch already present:', path)
    raise SystemExit(0)

if '<section id="safariFallback"' not in text:
    print('No safariFallback found; nothing to patch:', path)
    raise SystemExit(0)

css = r'''
/* smtinel-mobile-excel-evidence-v1: keep embedded Excel evidence reachable on phone previews. */
#safariFallback .sf-assets{margin:10px auto 14px!important;border-color:#9b5874!important;background:linear-gradient(180deg,#1b2940,#121d31)!important;box-shadow:0 12px 28px #0005}
#safariFallback .sf-assets h2{font-size:20px!important;margin-bottom:6px!important;color:#fff!important}
#safariFallback .sf-assets .sf-download{background:#b33152!important;border:1px solid #d95c78!important;font-weight:850!important}
#safariFallback .sf-assets details[open]{border-color:#a75f78!important;background:#26354d!important}
#safariFallback .sf-evidence-primer{max-width:1200px;margin:8px auto 12px;border:1px solid #7e5367;background:#23182a;color:#ffe4ed;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.45}
#safariFallback .sf-evidence-primer a{display:inline-block;margin-top:7px;background:#ad3656;color:white;border-radius:8px;padding:8px 10px;text-decoration:none;font-weight:800}
#safariFallback .sf-table-overflow{max-height:52vh!important;background:#0c1525!important}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{font-size:11px!important}
@media(max-width:740px){#safariFallback{padding-bottom:18px!important}#safariFallback .sf-assets{margin:8px!important;padding:12px!important}#safariFallback .sf-assets h2{font-size:17px!important}#safariFallback .sf-evidence-primer{margin:8px!important}#safariFallback .sf-table-overflow{max-height:58vh!important}#safariFallback .sf-slide{margin-top:10px!important}}
'''

if '</style></head>' in text:
    text = text.replace('</style></head>', css + '\n</style></head>', 1)
else:
    text = text.replace('</head>', '<style>' + css + '</style></head>', 1)

# Move the full evidence block before the slides. In the prior fallback it was
# after all slides, which made Excel look missing on a phone. Astonishingly,
# humans do not enjoy scrolling through 27 slides to find an attachment.
match = re.search(r'\n<section id="sf-evidence" class="sf-assets">.*?</section>\n', text, flags=re.S)
if match:
    evidence = match.group(0).strip()
    text = text[:match.start()] + '\n' + text[match.end():]
    # Open the first two details blocks so Excel sheets are visible immediately.
    opened = 0
    def open_first_details(m: re.Match[str]) -> str:
        nonlocal opened
        opened += 1
        return '<details open>' if opened <= 2 else m.group(0)
    evidence = re.sub(r'<details(?!\s+open)>', open_first_details, evidence)
    primer = ('<div class="sf-evidence-primer"><strong>Excel / evidencias recuperadas primero.</strong> '
              'Los archivos incrustados del PowerPoint se muestran antes de las láminas para que en móvil no parezcan desaparecidos. '
              '<a href="#sf-evidence">Ir a Excel / adjuntos</a></div>')
    insert_after = re.search(r'</details>\s*', text)
    if insert_after:
        pos = insert_after.end()
        text = text[:pos] + '\n' + primer + '\n' + evidence + '\n' + text[pos:]
    else:
        text = text.replace('<section id="safariFallback"', evidence + '\n<section id="safariFallback"', 1)

text = text.replace('Índice de diapositivas · abrir', 'Índice de diapositivas · abrir / evidencias arriba')
path.write_text(text, encoding='utf-8')
print('Mobile Excel evidence patch applied:', path)
