"""Command-line interface for the FX margin scraper."""

from __future__ import annotations

import argparse
import json
import sys

import requests

from fx_margin_scraper.scraper import DEFAULT_LEVERAGE_TIERS, ScraperError, scrape_fx_margins


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Scrape ECB FX reference rates and compute margin requirements.",
    )
    parser.add_argument(
        "--leverage",
        type=int,
        nargs="+",
        default=list(DEFAULT_LEVERAGE_TIERS),
        help="Leverage tiers to report (default: 10 20 50 100).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print machine-readable JSON output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        rates, margins = scrape_fx_margins(leverage_tiers=args.leverage)
    except ScraperError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except requests.HTTPError as exc:
        print(f"error: HTTP request failed: {exc}", file=sys.stderr)
        return 1

    if args.json:
        payload = {
            "rates": [
                {"base": rate.base, "quote": rate.quote, "rate": rate.rate}
                for rate in rates
            ],
            "margins": [
                {
                    "pair": margin.pair,
                    "leverage": margin.leverage,
                    "margin_percent": margin.margin_percent,
                }
                for margin in margins
            ],
        }
        print(json.dumps(payload, indent=2))
        return 0

    print(f"Fetched {len(rates)} ECB reference rates")
    for rate in rates[:5]:
        print(f"  {rate.base}/{rate.quote}: {rate.rate}")
    if len(rates) > 5:
        print(f"  ... and {len(rates) - 5} more")

    print(f"\nComputed {len(margins)} margin rows across leverage tiers {args.leverage}")
    for margin in margins[:8]:
        print(f"  {margin.pair} @ {margin.leverage}:1 -> {margin.margin_percent}% margin")
    if len(margins) > 8:
        print(f"  ... and {len(margins) - 8} more")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
