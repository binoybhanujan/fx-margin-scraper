"""Console entry point when installed via pip."""

import logging
import sys

from fx_scraper.runner import CONSOLIDATED_DIR, MARKET_DIR, print_summary, run_all_scrapers


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Scrape FX rates from all registered banks and consolidate to CSV."
    )
    parser.add_argument("-q", "--quiet", action="store_true")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument(
        "--mas-only",
        action="store_true",
        help="Fetch MAS daily rates only (no bank scrape).",
    )
    parser.add_argument(
        "--skip-mas",
        action="store_true",
        help="Skip the MAS daily download.",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    try:
        snapshots = run_all_scrapers(
            scrape_banks=not args.mas_only,
            scrape_mas=not args.skip_mas,
        )
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if not args.quiet:
        if snapshots:
            print_summary(snapshots)
        print(f"Consolidated output: {CONSOLIDATED_DIR / 'latest.csv'}")
        if not args.skip_mas:
            print(f"MAS market output:   {MARKET_DIR / 'latest.csv'}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
