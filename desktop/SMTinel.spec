# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

ROOT = Path.cwd()
APP = ROOT / "desktop" / "app.py"

# Bundle only the runtime files needed by the local web app. Add more folders here
# if SMTinel starts depending on additional static assets.
datas = []
for name in [
    "index.html",
    "modules",
    "assets",
    "frontend",
    "main",
    "README.md",
]:
    source = ROOT / name
    if source.exists():
        datas.append((str(source), name))


a = Analysis(
    [str(APP)],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SMTinel",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="SMTinel",
)
