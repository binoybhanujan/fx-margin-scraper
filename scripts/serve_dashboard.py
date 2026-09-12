"""Serve a built dashboard (`frontend/dist`) plus repo CSVs at /repo-data.

For local development use `cd frontend && npm run dev` (Vite). This script is
for a production-style static preview after `npm run build`.
"""

from __future__ import annotations

import argparse
import posixpath
import sys
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
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
        rel = raw.lstrip("/") or "."
        if rel == ".":
            return str(FRONTEND_DIST / "index.html")
        candidate = (FRONTEND_DIST / rel).resolve()
        front_root = FRONTEND_DIST.resolve()
        if candidate == front_root or front_root in candidate.parents:
            if candidate.is_file():
                return str(candidate)
            return str(FRONTEND_DIST / "index.html")
        return str(FRONTEND_DIST / "index.html")

    def log_message(self, format: str, *args: object) -> None:
        message = format % args
        print(f"{self.address_string()} - {message}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Serve the built FX dashboard and consolidated CSVs."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args(argv)

    if not (FRONTEND_DIST / "index.html").is_file():
        print(
            "No frontend/dist build found. For development run:\n"
            "  cd frontend && npm install && npm run dev\n"
            "Or build first:\n"
            "  cd frontend && npm run build\n"
            "  python scripts/serve_dashboard.py",
            file=sys.stderr,
        )
        return 1

    handler = partial(DashboardHandler, directory=str(FRONTEND_DIST))
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
