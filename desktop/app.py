"""SMTinel Windows desktop launcher.

This launcher serves the repository root through a local HTTP server and opens the
main dashboard in the default browser. It is intentionally local-first: no cloud
services are started by the launcher itself. SMTinel decides when to use cloud
features from the web UI.
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_NAME = "SMTinel"
DEFAULT_PORT = 4181
HOST = "127.0.0.1"


def _runtime_root() -> Path:
    """Return the folder that contains the packaged repo/web files."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


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


def main() -> int:
    try:
        web_root = _find_web_root()
        port = _pick_port()
        server = serve(web_root, port)
        # Open the root instead of /index.html. Some browser/app flows append a
        # trailing slash to /index.html, which breaks relative static assets.
        url = f"http://{HOST}:{port}/"
        print(f"{APP_NAME} running at {url}")
        webbrowser.open(url)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Closing SMTinel...")
        finally:
            server.shutdown()
        return 0
    except Exception as exc:  # noqa: BLE001 - user-facing launcher needs a readable failure.
        print(f"SMTinel launcher error: {exc}")
        input("Press Enter to close...")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
