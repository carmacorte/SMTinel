# SMTinel Desktop for Windows

This folder packages SMTinel as a Windows desktop application using Python, PyInstaller, and pywebview.

The desktop app does not rewrite SMTinel. It serves the existing repository `index.html` through a local server and opens it inside a dedicated desktop window backed by Microsoft WebView2. It does not open Edge, Chrome, or Opera as a normal browser tab.

## Why this approach

- Reuses the same SMTinel web code from the repository.
- Keeps the dashboard local-first and fast.
- Opens as a desktop-style app window without browser tabs or a URL bar.
- Avoids sharing runtime state with random browser tabs, extensions, sync, and profile baggage.
- Allows the same `index.html` and `modules/` files to be packaged into a Windows folder.

## Requirements

- Windows 10 or later
- Microsoft Edge WebView2 Runtime. Most Windows 10/11 machines already include it.
- Python 3.11+
- Python launcher `py` available from CMD

Check Python:

```bat
py --version
```

## Test locally

From the repository root, run:

```bat
desktop\run_local.bat
```

Or manually:

```bat
py desktop\app.py
```

This starts a local server and opens SMTinel inside a dedicated desktop window.

## Build the Windows package

From the repository root, run:

```bat
desktop\build_windows_exe.bat
```

Or manually:

```bat
py -m pip install --upgrade pip
py -m pip install -r desktop\requirements.txt
py -m PyInstaller desktop\SMTinel.spec --clean --noconfirm
```

Output:

```text
dist\SMTinel\SMTinel.exe
```

Copy the full folder:

```text
dist\SMTinel\
```

Do not copy only `SMTinel.exe`. The packaged app needs the bundled `_internal` folder beside it.

## Behavior

- Startup is local-first.
- No Supabase connection is started by the launcher.
- Cloud/RCCA/8D sync remains controlled by SMTinel UI logic.
- If port `4181` is busy, the launcher picks the next available local port.
- WebView2 profile data is isolated under `%LOCALAPPDATA%\SMTinel\WebView2`.

## Debug mode

To show server request logs and pywebview debug output:

```bat
set SMTINEL_DEBUG=1
desktop\run_local.bat
```
