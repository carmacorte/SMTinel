"""SMTinel Windows desktop app.

This launcher serves the repository root through a local HTTP server and opens the
main dashboard inside a dedicated desktop window using pywebview/WebView2. It is
intentionally local-first: no cloud services are started by the launcher itself.
SMTinel decides when to use cloud features from the web UI.
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_NAME = "SMTinel"
DEFAULT_PORT = 4181
HOST = "127.0.0.1"
WINDOW_WIDTH = 1500
WINDOW_HEIGHT = 950
WINDOW_MIN_WIDTH = 1200
WINDOW_MIN_HEIGHT = 760


def _runtime_root() -> Path:
    """Return the folder that contains the packaged repo/web files."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def _app_data_dir() -> Path:
    """Return an isolated storage folder for the embedded WebView profile."""
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    path = Path(base) / "SMTinel" / "WebView2"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _find_web_root() -> Path:
    root = _runtime_root()
    candidates = [
        root,
        root / "web",
        root / "_internal" / "web",
        root / "_internal",
    ]
    for candidate in candidates:
        if (candidate / "index.html").exists():
            return candidate
    raise FileNotFoundError(
        "Could not find index.html. Keep SMTinel.exe next to index.html, or build with the bundled web files."
    )


def _is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((HOST, port)) != 0


def _pick_port(preferred: int = DEFAULT_PORT) -> int:
    if _is_port_free(preferred):
        return preferred
    for port in range(preferred + 1, preferred + 40):
        if _is_port_free(port):
            return port
    raise OSError("No free local port found for SMTinel.")


class QuietHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args: object) -> None:
        # Keep the packaged app quiet unless launched from a console.
        if os.environ.get("SMTINEL_DEBUG") == "1":
            super().log_message(fmt, *args)


def serve(web_root: Path, port: int) -> ThreadingHTTPServer:
    handler = partial(QuietHandler, directory=str(web_root))
    server = ThreadingHTTPServer((HOST, port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def open_desktop_window(url: str) -> None:
    """Open SMTinel in a dedicated desktop window instead of an external browser."""
    try:
        import webview
    except ImportError as exc:  # pragma: no cover - user-facing launcher guard.
        raise RuntimeError(
            "pywebview is not installed. Run: py -m pip install -r desktop\\requirements.txt"
        ) from exc

    webview.create_window(
        APP_NAME,
        url,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        min_size=(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT),
        text_select=True,
    )
    webview.start(
        gui="edgechromium",
        debug=os.environ.get("SMTINEL_DEBUG") == "1",
        private_mode=False,
        storage_path=str(_app_data_dir()),
    )


def main() -> int:
    server: ThreadingHTTPServer | None = None
    try:
        web_root = _find_web_root()
        port = _pick_port()
        server = serve(web_root, port)
        # Open the root instead of /index.html. Some browser/app flows append a
        # trailing slash to /index.html, which breaks relative static assets.
        url = f"http://{HOST}:{port}/"
        print(f"{APP_NAME} running at {url}")
        open_desktop_window(url)
        return 0
    except Exception as exc:  # noqa: BLE001 - user-facing launcher needs a readable failure.
        print(f"SMTinel launcher error: {exc}")
        input("Press Enter to close...")
        return 1
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
            time.sleep(0.2)


if __name__ == "__main__":
    raise SystemExit(main())
