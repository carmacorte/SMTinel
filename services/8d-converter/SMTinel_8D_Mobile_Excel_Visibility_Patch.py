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
    print('Usage: python SMTinel_8D_Mobile_Excel_Visibility_Patch.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')
marker = 'smtinel-mobile-excel-evidence-v2'
if marker in text:
    print('Mobile Excel evidence patch already present:', path)
    raise SystemExit(0)

if '<section id="safariFallback"' not in text:
    print('No safariFallback found; nothing to patch:', path)
    raise SystemExit(0)

css = r'''
/* smtinel-mobile-excel-evidence-v2: keep embedded evidence reachable on phone previews. */
#safariFallback .sf-assets{margin:12px auto 16px!important;border:1px solid #d9e1d6!important;background:#ffffff!important;box-shadow:0 14px 34px rgba(36,49,43,.10)!important;color:#25302c!important}
#safariFallback .sf-assets h2{font-size:20px!important;margin-bottom:6px!important;color:#233029!important}
#safariFallback .sf-assets .sf-download{background:#6b3345!important;border:1px solid #6b3345!important;color:#fff!important;font-weight:850!important}
#safariFallback .sf-assets details[open]{border-color:#c9d5c6!important;background:#f7faf6!important;color:#25302c!important}
#safariFallback .sf-evidence-primer{max-width:1200px;margin:10px auto 14px;border:1px solid #d9e1d6;background:#f7faf6;color:#25302c;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.45;box-shadow:0 10px 28px rgba(36,49,43,.07)}
#safariFallback .sf-evidence-primer a{display:inline-block;margin-top:8px;background:#6b3345;color:white;border-radius:10px;padding:8px 12px;text-decoration:none;font-weight:800}
#safariFallback .sf-table-overflow{max-height:52vh!important;background:#ffffff!important;border-color:#d9e1d6!important}
#safariFallback .sf-table-overflow td,#safariFallback .sf-table-overflow th{font-size:11px!important;color:#25302c!important}
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
    opened = [0]

    def open_first_details(m: re.Match[str]) -> str:
        opened[0] += 1
        return '<details open>' if opened[0] <= 2 else m.group(0)

    evidence = re.sub(r'<details(?!\s+open)>', open_first_details, evidence)
    primer = ('<div class="sf-evidence-primer"><strong>Recovered evidence is shown first.</strong> '
              'Embedded PowerPoint files are shown before the slides so they do not look missing on mobile. '
              '<a href="#sf-evidence">Go to evidence / attachments</a></div>')
    insert_after = re.search(r'</details>\s*', text)
    if insert_after:
        pos = insert_after.end()
        text = text[:pos] + '\n' + primer + '\n' + evidence + '\n' + text[pos:]
    else:
        text = text.replace('<section id="safariFallback"', evidence + '\n<section id="safariFallback"', 1)

text = text.replace('Indice de diapositivas . abrir', 'Slide Index . open / evidence above')
text = text.replace('Índice de diapositivas · abrir', 'Slide Index · open / evidence above')
text = text.replace('Índice de diapositivas · abrir / evidencias arriba', 'Slide Index · open / evidence above')
text = text.replace('Notas originales', 'Original notes')
text = text.replace('Diapositivas', 'Slides')
text = text.replace('Evidencias', 'Evidence')
path.write_text(text, encoding='utf-8')
print('Mobile Excel evidence patch applied:', path)
