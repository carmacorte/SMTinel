# SMTinel Desktop for Windows

This folder packages SMTinel as a Windows desktop launcher using Python + PyInstaller.

The desktop app does not rewrite SMTinel. It serves the existing repository `index.html` through a local server and opens it at `http://127.0.0.1:4181/index.html`.

## Why this approach

- Reuses the same SMTinel web code from the repository.
- Keeps the dashboard local-first and fast.
- Avoids depending on Safari, Chrome, Opera, or whatever browser decided to be difficult today.
- Allows the same `index.html` and `modules/` files to be packaged into a Windows folder.

## Requirements

- Windows 10 or later
- Python 3.11+
- Python added to PATH

## Test locally

From the repository root, run:

```bat
desktop\run_local.bat
```

This starts a local server and opens SMTinel in the default browser.

## Build the Windows package

From the repository root, run:

```bat
desktop\build_windows_exe.bat
```

Output:

```text
dist\SMTinel\SMTinel.exe
```

Copy the full folder:

```text
dist\SMTinel\
```

Do not copy only `SMTinel.exe`. The packaged app needs the bundled web files beside it.

## Behavior

- Startup is local-first.
- No Supabase connection is started by the launcher.
- Cloud/RCCA/8D sync remains controlled by SMTinel UI logic.
- If port `4181` is busy, the launcher picks the next available local port.

## Debug mode

To show server request logs:

```bat
set SMTINEL_DEBUG=1
desktop\run_local.bat
```
