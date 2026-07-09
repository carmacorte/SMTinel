# SMTinel .NET WebView2 Desktop Portable

This is the safer Windows desktop launcher route for SMTinel.

The previous portable package used PyInstaller. Windows Defender can flag PyInstaller bootloader executables as virus or potentially unwanted software, especially when the executable is unsigned. That is not a useful operator experience unless the goal is to make every download feel like a crime scene.

This launcher uses a native .NET Windows Forms shell with Microsoft Edge WebView2.

## Build locally

```powershell
dotnet restore desktop-dotnet\SMTinel.Desktop.csproj
dotnet publish desktop-dotnet\SMTinel.Desktop.csproj -c Release -r win-x64 --self-contained false -o publish\SMTinel
```

Then copy the web runtime files into `publish\SMTinel`:

- `index.html`
- `modules/`
- `assets/`
- `frontend/`
- `main/`
- `data/`
- `docs/`
- `examples/`
- `export/`

## GitHub Actions

Run:

```text
Actions → Build Windows Dotnet Desktop → Run workflow → publish_release=true
```

The workflow publishes:

```text
SMTinel-Windows-Dotnet-Portable.zip
```

Release tag:

```text
portable-dotnet-latest
```

## Runtime requirements

- Windows 10/11
- .NET Desktop Runtime 8
- Microsoft Edge WebView2 Runtime

Most Windows 11 systems already include WebView2. .NET Desktop Runtime may need to be installed unless the workflow is changed to publish self-contained.

## Why this route

- Avoids PyInstaller bootloader false positives.
- Keeps SMTinel as a real desktop window.
- Keeps local static serving for PDFs and modules.
- Preserves the current SMTinel web app without rewriting the entire product because apparently one apocalypse at a time is enough.
