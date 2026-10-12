#!/usr/bin/env python3
"""SMTinel 8D engine: PPTX -> autonomous English handoff HTML."""
from pathlib import Path
import sys,subprocess
if len(sys.argv)<3:
 print('Usage: python Convertir_PPTX_a_HTML_iOS.py report.pptx report.html')
 raise SystemExit(2)
src=Path(sys.argv[1]).resolve(); dst=Path(sys.argv[2]).resolve()
root=Path(__file__).resolve().parent
intermediate=dst.with_name(dst.stem+'__intermediate.html')
try:
 subprocess.run([sys.executable,str(root/'SMTinel_PPTX_a_HTML_Converter.py'),str(src),str(intermediate)],check=True)
 subprocess.run([sys.executable,str(root/'SMTinel_8D_iOS_Progressive_Patch.py'),str(intermediate),str(dst)],check=True)
 ole_patch=root/'SMTinel_8D_OLE_Attachment_Normalizer.py'
 if not ole_patch.is_file():
  raise RuntimeError('Required OLE attachment normalizer missing from deployment')
 subprocess.run([sys.executable,str(ole_patch),str(dst)],check=True)
 mail_patch=root/'SMTinel_8D_Mail_Evidence_Patch.py'
 if mail_patch.exists():
  subprocess.run([sys.executable,str(mail_patch),str(dst)],check=True)
 mobile_excel_patch=root/'SMTinel_8D_Mobile_Excel_Visibility_Patch.py'
 if mobile_excel_patch.exists():
  subprocess.run([sys.executable,str(mobile_excel_patch),str(dst)],check=True)
 handoff_theme_patch=root/'SMTinel_8D_Handoff_English_Theme_Patch.py'
 if not handoff_theme_patch.is_file():
  raise RuntimeError('Required English Light Handoff theme patch missing from deployment')
 subprocess.run([sys.executable,str(handoff_theme_patch),str(dst)],check=True)
 final_polish_patch=root/'SMTinel_8D_Final_English_Polish_Patch.py'
 if not final_polish_patch.is_file():
  raise RuntimeError('Required final English polish patch missing from deployment')
 subprocess.run([sys.executable,str(final_polish_patch),str(dst)],check=True)
 # Validate the final exported artifact, including the no-JavaScript iPhone view.
 output=dst.read_text(encoding='utf-8')
 checks={
  'English document language':'<html lang="en"' in output,
  'Light Handoff theme':'smtinel-8d-english-handoff-theme-v1' in output,
  'iPhone fallback':'id="safariFallback"' in output,
  'Light iPhone fallback CSS':'#safariFallback .sf-slide-head{background:#ffffff!important' in output,
  'English mobile notes':'Original notes' in output or 'Show original notes' in output,
  'English evidence labels':'8D Evidence' in output or 'PowerPoint Evidence' in output,
  'No generic OLE downloads':'oleObject1.bin' not in output and 'oleObject2.bin' not in output,
 }
 missing=[name for name,ok in checks.items() if not ok]
 if missing:
  raise RuntimeError('8D Handoff export failed validation: '+', '.join(missing))
 print('8D English Light Handoff verified (desktop + iPhone fallback)')

finally:
 intermediate.unlink(missing_ok=True)
print('Portable English handoff HTML created:',dst)
