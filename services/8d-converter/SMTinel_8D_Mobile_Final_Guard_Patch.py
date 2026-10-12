#!/usr/bin/env python3
"""Final mobile/iPhone guard for SMTinel 8D Handoff exports.

Runs after all other patches. It removes mixed Spanish/English chrome in the
no-JavaScript iPhone preview, keeps evidence labels honest, and fails the
conversion if the common mobile strings from field screenshots are still there.
Slide images and PowerPoint notes are not translated.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('Usage: python SMTinel_8D_Mobile_Final_Guard_Patch.py report.html')
    raise SystemExit(2)

path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding='utf-8')

replacements = {
    'Evidence originales del PowerPoint': 'Original PowerPoint Evidence',
    'Evidences originales del PowerPoint': 'Original PowerPoint Evidence',
    'Evidencias originales del PowerPoint': 'Original PowerPoint Evidence',
    'Evidence original del PowerPoint': 'Original PowerPoint Evidence',
    'Las tablas siguientes permiten consultar la trazabilidad sin ejecutar scripts. Las evidence incrustadas conservan sus bytes originales.': 'The tables below allow evidence review without running scripts. Embedded evidence preserves its original bytes.',
    'Las tablas siguientes permiten consultar la trazabilidad sin ejecutar scripts. Las evidencias incrustadas conservan sus bytes originales.': 'The tables below allow evidence review without running scripts. Embedded evidence preserves its original bytes.',
    'Las tablas siguientes permiten consultar la trazabilidad sin ejecutar scripts.': 'The tables below allow evidence review without running scripts.',
    'Las evidence incrustadas conservan sus bytes originales.': 'Embedded evidence preserves its original bytes.',
    'Las evidencias incrustadas conservan sus bytes originales.': 'Embedded evidence preserves its original bytes.',
    'archivo(s) recuperado(s)': 'recovered file(s)',
    'archivo(s) incrustado(s)': 'embedded file(s)',
    'hipervínculos de correo': 'email hyperlinks',
    'Página': 'Page',
    'Ir a evidencias / adjuntos': 'Go to evidence / attachments',
    'Ir a evidencia / adjuntos': 'Go to evidence / attachments',
    'Ir a Excel / adjuntos': 'Go to evidence / attachments',
    'Excel / recovered evidence first.': 'Recovered evidence is shown first.',
    'Recovered evidence first.': 'Recovered evidence is shown first.',
    'Los archivos incrustados del PowerPoint se muestran antes de las slides para que en móvil no parezcan desaparecidos.': 'Recovered PowerPoint attachments are shown first so they do not look missing on mobile.',
    'Los archivos incrustados del PowerPoint se muestran antes de las láminas para que en móvil no parezcan desaparecidos.': 'Recovered PowerPoint attachments are shown first so they do not look missing on mobile.',
    'Descargar archivo original': 'Download original file',
    'Volver al inicio': 'Back to top',
    'evidence incrustadas': 'embedded evidence',
    'evidencias incrustadas': 'embedded evidence',
    'diapositiva(s)': 'slide(s)',
    'diapositiva': 'slide',
    'Diapositiva': 'Slide',
    'láminas': 'slides',
    'lámina': 'slide',
}
for old, new in replacements.items():
    text = text.replace(old, new)

# Fix fallback section headings assembled from previous partial replacements.
text = re.sub(r'<h2>\s*(?:Evidence|Evidencias?)\s+original(?:es)?\s+del\s+PowerPoint\s*</h2>', '<h2>Original PowerPoint Evidence</h2>', text, flags=re.I)
text = re.sub(r'<summary>\s*(?:Evidence|Evidencias?)\s+original(?:es)?\s+del\s+PowerPoint\s*</summary>', '<summary>Original PowerPoint Evidence</summary>', text, flags=re.I)

# Repair attachment labels in the embedded JSON if a prior pass left opaque OLE
# files unresolved. Do not fake extensions; just avoid incorrect Excel/Word/PDF
# labels when the bytes are still a CFB/OLE wrapper.
match = re.search(r'(<script\s+id="embedded-data"\s+type="application/json">)(.*?)(</script>)', text, flags=re.S)
if match:
    try:
        data = json.loads(match.group(2))
        changed = False
        for att in data.get('attachments') or []:
            name = str(att.get('name') or '')
            b64 = str(att.get('b64') or '')
            is_opaque = name.lower().endswith('.bin') or name.lower().startswith('oleobject')
            if is_opaque:
                att['type'] = 'Embedded file'
                att['mime'] = att.get('mime') or 'application/octet-stream'
                changed = True
            elif name.lower().endswith('.txt'):
                att['type'] = 'Text'
                att['mime'] = 'text/plain'
                changed = True
            elif name.lower().endswith('.eml'):
                att['type'] = 'Email'
                att['mime'] = 'message/rfc822'
                changed = True
        if changed:
            new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
            text = text[:match.start(2)] + new_json + text[match.end(2):]
    except Exception:
        pass

blocked = [
    'Evidence originales del PowerPoint',
    'Evidencias originales del PowerPoint',
    'Las tablas siguientes permiten',
    'evidence incrustadas',
    'evidencias incrustadas',
    'Volver al inicio',
    'Descargar archivo original',
    'Ir a Excel / adjuntos',
    'archivo(s) incrustado(s)',
]
remaining = [s for s in blocked if s in text]
if remaining:
    raise RuntimeError('8D mobile final guard failed. Remaining mixed UI strings: ' + ', '.join(remaining))

path.write_text(text, encoding='utf-8')
print('8D mobile final guard applied:', path)
