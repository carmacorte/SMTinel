# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

ROOT = Path.cwd()
APP = ROOT / "desktop" / "app.py"

# Bundle only the runtime files needed by the local web app. For PyInstaller,
# file data destinations are directories, not final file names. So index.html
# must target "."; otherwise PyInstaller creates _internal/index.html/index.html
# and the local server shows a directory listing. Humanity endures.
datas = []

file_targets = {
    "index.html": ".",
    "README.md": ".",
}
for name, target in file_targets.items():
    source = ROOT / name
    if source.exists() and source.is_file():
        datas.append((str(source), target))

# Board Impact can reference source PDFs from the app root, for example
# /WARWICK.pdf. Include root-level visual evidence PDFs when present at build
# time so the desktop bundle can render them offline.
for pattern in ["*.pdf", "*.PDF"]:
    for source in ROOT.glob(pattern):
        if source.is_file():
            datas.append((str(source), "."))

folder_targets = [
    "modules",
    "assets",
    "frontend",
    "main",
    "data",
    "docs",
    "examples",
    "export",
]
for name in folder_targets:
    source = ROOT / name
    if source.exists() and source.is_dir():
        datas.append((str(source), name))

hiddenimports = []
for package in ["webview", "clr_loader", "pythonnet"]:
    try:
        hiddenimports.extend(collect_submodules(package))
    except Exception:
        pass
hiddenimports.extend([
    "clr",
    "webview.platforms.edgechromium",
    "webview.platforms.winforms",
])
hiddenimports = sorted(set(hiddenimports))


a = Analysis(
    [str(APP)],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
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
