"""Serve the dashboard as static files with no Node, Vite, or other build tools.

Maps /repo-data/... to the repository data/ directory so the dashboard can load
consolidated CSVs the same way the old Vite plugin did.
"""

from __future__ import annotations

import argparse
import posixpath
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
DATA_DIR = REPO_ROOT / "data"


class DashboardHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        raw = posixpath.normpath(unquote(parsed.path))
        if not raw.startswith("/"):
            raw = "/" + raw
        if raw == "/repo-data" or raw.startswith("/repo-data/"):
            rel = raw[len("/repo-data") :].lstrip("/")
            candidate = (DATA_DIR / rel).resolve()
            data_root = DATA_DIR.resolve()
            if candidate == data_root or data_root in candidate.parents:
                return str(candidate)
            return str(data_root / "__missing__")
        # Serve frontend/ as the document root.
        rel = raw.lstrip("/") or "."
        if rel == ".":
            return str(FRONTEND_DIR / "index.html")
        candidate = (FRONTEND_DIR / rel).resolve()
        front_root = FRONTEND_DIR.resolve()
        if candidate == front_root or front_root in candidate.parents:
            return str(candidate)
        return str(front_root / "__missing__")

    def log_message(self, format: str, *args: object) -> None:
        message = format % args
        print(f"{self.address_string()} - {message}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Serve the FX dashboard and consolidated CSVs (no build step)."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args(argv)

    handler = partial(DashboardHandler, directory=str(FRONTEND_DIR))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Dashboard: http://{args.host}:{args.port}/", flush=True)
    print(f"Data:      http://{args.host}:{args.port}/repo-data/consolidated/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
