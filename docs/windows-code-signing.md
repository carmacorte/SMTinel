# Windows Code Signing for SMTinel Desktop

SMTinel Desktop can be signed during the GitHub Actions release build when a valid code-signing certificate is configured as repository secrets.

The current .NET WebView2 portable route can run unsigned, but Windows may show **Unknown Publisher**. Signing the executable improves trust and avoids making every operator feel like they are launching a suspicious USB stick from a parking lot.

## Required GitHub secrets

Create these secrets in:

```text
GitHub → Settings → Secrets and variables → Actions → New repository secret
```

| Secret | Purpose |
|---|---|
| `WINDOWS_CERT_PFX_BASE64` | Base64-encoded `.pfx` code signing certificate |
| `WINDOWS_CERT_PASSWORD` | Password for the `.pfx` certificate |

Do **not** commit the `.pfx` file to the repository.

## Convert PFX to Base64

Run this locally in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\certificate.pfx")) | Set-Clipboard
```

Paste the copied value into the `WINDOWS_CERT_PFX_BASE64` secret.

Set the certificate password in `WINDOWS_CERT_PASSWORD`.

## Build and sign

Run:

```text
Actions → Build Windows Dotnet Desktop → Run workflow → publish_release=true
```

The workflow signs before compressing the ZIP:

```text
dotnet publish
copy SMTinel web runtime files
sign publish\SMTinel\SMTinel.exe
verify signature
create SMTinel-Windows-Dotnet-Portable.zip
publish GitHub Release
```

## Verification

After downloading and extracting the ZIP, verify on Windows:

```cmd
signtool verify /pa /v SMTinel.exe
```

Or right-click:

```text
SMTinel.exe → Properties → Digital Signatures
```

## If secrets are missing

The workflow does not fail when signing secrets are missing. It logs that the build will continue unsigned. That keeps internal builds working while allowing the same workflow to become signed once the certificate is available.

## Certificate notes

- OV certificates help identify the publisher but may still need reputation buildup.
- EV certificates usually build SmartScreen trust faster.
- Timestamping is enabled using `http://timestamp.digicert.com`, so signatures remain valid after the certificate expires.
