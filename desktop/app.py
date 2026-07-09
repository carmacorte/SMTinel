"""SMTinel Windows desktop app.

This launcher serves the repository root through a local HTTP server and opens the
main dashboard inside a dedicated desktop window using pywebview/WebView2. It is
intentionally local-first: no cloud services are started by the launcher itself.
SMTinel decides when to use cloud features from the web UI.
"""

from __future__ import annotations

import io
import os
import socket
import sys
import threading
import time
import traceback
import urllib.parse
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
PDF_FALLBACK_DIRS = (
    Path("docs") / "datasheets",
    Path("docs"),
    Path("data"),
)


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


def _safe_stdin() -> None:
    """Provide stdin for windowed PyInstaller builds.

    Windowed executables run with sys.stdin set to None. Some transitive desktop
    GUI imports still call input() when probing runtimes. Without a harmless
    stream, the packaged app fails with: input(): lost sys.stdin. Because yes,
    even a desktop window can trip over a missing console like it is 1997.
    """
    if sys.stdin is None:
        sys.stdin = io.StringIO("\n")


def _show_error_dialog(title: str, message: str) -> None:
    """Show a readable error dialog when the packaged app has no console."""
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(title, message)
        root.destroy()
    except Exception:
        # Last-resort fallback for console execution.
        print(f"{title}: {message}")


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
    def _pdf_fallback_path(self, requested_path: str) -> str | None:
        """Map /MODEL.pdf requests to docs/datasheets/MODEL.pdf when needed."""
        parsed_path = urllib.parse.urlparse(requested_path).path
        filename = Path(urllib.parse.unquote(parsed_path)).name
        if not filename.lower().endswith(".pdf"):
            return None
        if "/" in filename or "\\" in filename:
            return None

        root = Path(self.directory)
        direct = root / filename
        if direct.exists():
            return None

        variants = {filename, filename.upper(), filename.lower()}
        if filename.lower().endswith(".pdf"):
            stem = filename[:-4]
            variants.update({f"{stem}.PDF", f"{stem.upper()}.pdf", f"{stem.upper()}.PDF"})

        for relative_dir in PDF_FALLBACK_DIRS:
            folder = root / relative_dir
            if not folder.exists():
                continue
            for variant in variants:
                candidate = folder / variant
                if candidate.exists() and candidate.is_file():
                    return str(candidate)

            requested_lower = filename.lower()
            for candidate in folder.glob("*.pdf"):
                if candidate.name.lower() == requested_lower:
                    return str(candidate)
            for candidate in folder.glob("*.PDF"):
                if candidate.name.lower() == requested_lower:
                    return str(candidate)

        return None

    def translate_path(self, path: str) -> str:
        fallback = self._pdf_fallback_path(path)
        if fallback:
            if os.environ.get("SMTINEL_DEBUG") == "1":
                print(f"PDF fallback: {path} -> {fallback}")
            return fallback
        return super().translate_path(path)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def handle(self) -> None:
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # WebView2 may cancel asset requests during navigation, screenshots,
            # refresh, or window close. That is harmless; printing a traceback
            # just makes the console look like it witnessed a crime.
            if os.environ.get("SMTINEL_DEBUG") == "1":
                raise

    def copyfile(self, source, outputfile) -> None:  # noqa: ANN001 - inherited signature.
        try:
            super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            if os.environ.get("SMTINEL_DEBUG") == "1":
                raise

    def log_error(self, fmt: str, *args: object) -> None:
        if os.environ.get("SMTINEL_DEBUG") == "1":
            super().log_error(fmt, *args)

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
    _safe_stdin()
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
    _safe_stdin()
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
        details = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        _show_error_dialog(
            "SMTinel launcher error",
            f"SMTinel could not start.\n\n{exc}\n\nDetails:\n{details[-1800:]}",
        )
        return 1
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
            time.sleep(0.2)


if __name__ == "__main__":
    raise SystemExit(main())
