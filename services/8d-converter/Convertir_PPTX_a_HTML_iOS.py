#!/usr/bin/env python3
"""Motor piloto 8D: PPTX -> HTML autónomo con fallback móvil sin JavaScript."""
from pathlib import Path
import sys,subprocess
if len(sys.argv)<3:
 print('Uso: python Convertir_PPTX_a_HTML_iOS.py reporte.pptx reporte.html')
 raise SystemExit(2)
src=Path(sys.argv[1]).resolve(); dst=Path(sys.argv[2]).resolve()
root=Path(__file__).resolve().parent
intermediate=dst.with_name(dst.stem+'__intermedio.html')
try:
 subprocess.run([sys.executable,str(root/'SMTinel_PPTX_a_HTML_Converter.py'),str(src),str(intermediate)],check=True)
 subprocess.run([sys.executable,str(root/'SMTinel_8D_iOS_Progressive_Patch.py'),str(intermediate),str(dst)],check=True)
 mail_patch=root/'SMTinel_8D_Mail_Evidence_Patch.py'
 if mail_patch.exists():
  subprocess.run([sys.executable,str(mail_patch),str(dst)],check=True)
finally:
 intermediate.unlink(missing_ok=True)
print('HTML portátil creado:',dst)
