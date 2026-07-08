# Desktop Portable Module

SMTinel should expose the Windows portable package as an internal module instead of forcing users to open a separate external download page.

## User flow

```text
SMTinel
  More
    Desktop Portable
      Download Windows Portable
```

The operator remains inside SMTinel. The ZIP still downloads from GitHub Releases through the stable asset URL:

```text
https://github.com/carmacorte/SMTinel/releases/latest/download/SMTinel-Windows-Portable.zip
```

## Module file

```text
modules/desktop-portable.html
```

This module is designed to be loaded in an iframe inside the existing SMTinel shell:

```html
<iframe
  title="SMTinel Desktop Portable"
  src="modules/desktop-portable.html"
  style="width:100%;min-height:860px;border:0;border-radius:28px;background:transparent;"
  loading="lazy"
></iframe>
```

## Release refresh

To refresh the downloadable ZIP:

1. Open GitHub Actions.
2. Run **Build Windows Desktop**.
3. Use `publish_release=true`.
4. Confirm the release asset exists:

```text
SMTinel-Windows-Portable.zip
```

## Do not store ZIP in repo

Do not commit the portable ZIP into `docs/`, root, or the repository. It is large and should live in GitHub Releases. The website only needs a stable download link, because apparently websites prefer not being used as forklifts.
