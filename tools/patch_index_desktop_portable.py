"""Inject the SMTinel Desktop Portable module directly into index.html.

This patcher is intentionally conservative because index.html is a large
monolithic file. It inserts a small runtime integration script before </body>
without rewriting the application internals.

Result:
- Adds a visible internal "Desktop Portable" launcher to SMTinel.
- Opens modules/desktop-portable.html in an in-app overlay iframe.
- Keeps the operator inside smtinel.com instead of routing to portable.html.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MARKER = "SMTINEL_DESKTOP_PORTABLE_DIRECT_INTEGRATION"

INJECTION = r'''
<!-- SMTINEL_DESKTOP_PORTABLE_DIRECT_INTEGRATION -->
<script>
(function () {
  const MODULE_URL = 'modules/desktop-portable.html';
  const ZIP_URL = 'https://github.com/carmacorte/SMTinel/releases/latest/download/SMTinel-Windows-Portable.zip';
  const STYLE_ID = 'smtinel-desktop-portable-style';
  const LAUNCHER_ID = 'smtinel-desktop-portable-launcher';
  const OVERLAY_ID = 'smtinel-desktop-portable-overlay';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${LAUNCHER_ID} {
        position: fixed;
        right: 18px;
        bottom: 118px;
        z-index: 2147483000;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        padding: 0 18px;
        border: 0;
        border-radius: 999px;
        color: #fff;
        background: linear-gradient(135deg, #0d4667, #14906d);
        box-shadow: 0 22px 54px rgba(8,44,77,.30);
        font: 900 14px/1 Inter, Segoe UI, system-ui, sans-serif;
        cursor: pointer;
      }
      #${LAUNCHER_ID}:hover { transform: translateY(-1px); }
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483100;
        display: grid;
        grid-template-rows: auto 1fr;
        background: rgba(5, 18, 32, .58);
        backdrop-filter: blur(12px);
      }
      #${OVERLAY_ID}[hidden] { display: none; }
      .smtinel-dp-shell {
        width: min(1240px, calc(100vw - 28px));
        height: min(900px, calc(100vh - 28px));
        margin: 14px auto;
        display: grid;
        grid-template-rows: 58px 1fr;
        overflow: hidden;
        border-radius: 28px;
        background: #f5f9fc;
        box-shadow: 0 32px 90px rgba(0,0,0,.28);
        border: 1px solid rgba(255,255,255,.32);
      }
      .smtinel-dp-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 16px 0 20px;
        background: rgba(255,255,255,.92);
        border-bottom: 1px solid rgba(8,44,77,.10);
        color: #0d1b2f;
        font: 900 15px/1 Inter, Segoe UI, system-ui, sans-serif;
      }
      .smtinel-dp-actions { display: flex; gap: 10px; align-items: center; }
      .smtinel-dp-actions a,
      .smtinel-dp-actions button {
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(8,44,77,.12);
        background: #fff;
        color: #0d3154;
        text-decoration: none;
        font: 900 13px/1 Inter, Segoe UI, system-ui, sans-serif;
        cursor: pointer;
      }
      .smtinel-dp-actions a:first-child {
        color: #fff;
        border: 0;
        background: linear-gradient(135deg, #0d4667, #14906d);
      }
      .smtinel-dp-frame {
        width: 100%;
        height: 100%;
        border: 0;
        background: transparent;
      }
      @media (max-width: 720px) {
        #${LAUNCHER_ID} { right: 14px; bottom: 96px; min-height: 44px; padding: 0 14px; font-size: 12px; }
        .smtinel-dp-shell { width: 100vw; height: 100vh; margin: 0; border-radius: 0; }
        .smtinel-dp-bar { padding-left: 12px; }
        .smtinel-dp-actions a { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function openDesktopPortable() {
    injectStyle();
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.innerHTML = `
        <div class="smtinel-dp-shell" role="dialog" aria-modal="true" aria-label="SMTinel Desktop Portable">
          <div class="smtinel-dp-bar">
            <span>SMTinel Desktop Portable</span>
            <div class="smtinel-dp-actions">
              <a href="${ZIP_URL}" download>Download ZIP</a>
              <button type="button" data-smtinel-dp-close>Close</button>
            </div>
          </div>
          <iframe class="smtinel-dp-frame" title="SMTinel Desktop Portable" src="${MODULE_URL}" loading="lazy"></iframe>
        </div>
      `;
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('[data-smtinel-dp-close]')) {
          closeDesktopPortable();
        }
      });
      document.body.appendChild(overlay);
    }
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeDesktopPortable() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.hidden = true;
    document.documentElement.style.overflow = '';
  }

  function ensureLauncher() {
    if (!document.body || document.getElementById(LAUNCHER_ID)) return;
    injectStyle();
    const button = document.createElement('button');
    button.id = LAUNCHER_ID;
    button.type = 'button';
    button.innerHTML = '<span>⬇</span><span>Desktop Portable</span>';
    button.setAttribute('aria-label', 'Open SMTinel Desktop Portable download module');
    button.addEventListener('click', openDesktopPortable);
    document.body.appendChild(button);
  }

  function bindShortcut() {
    window.SMTinelDesktopPortable = {
      open: openDesktopPortable,
      close: closeDesktopPortable,
      downloadUrl: ZIP_URL,
      moduleUrl: MODULE_URL
    };
  }

  function start() {
    bindShortcut();
    ensureLauncher();
    const observer = new MutationObserver(() => ensureLauncher());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDesktopPortable();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
</script>
'''


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Desktop Portable index integration already present.")
        return 0

    needle = "</body>"
    lower_html = html.lower()
    pos = lower_html.rfind(needle)
    if pos == -1:
        raise SystemExit("Could not find </body> in index.html")

    patched = html[:pos] + INJECTION + "\n" + html[pos:]
    INDEX.write_text(patched, encoding="utf-8", newline="")
    print("Injected Desktop Portable module directly into index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
