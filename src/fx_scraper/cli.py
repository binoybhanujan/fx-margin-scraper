"""Console entry point when installed via pip."""

import logging
import sys

from fx_scraper.runner import CONSOLIDATED_DIR, print_summary, run_all_scrapers


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Scrape FX rates from all registered banks and consolidate to CSV."
    )
    parser.add_argument("-q", "--quiet", action="store_true")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    try:
        snapshots = run_all_scrapers()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if not args.quiet:
        print_summary(snapshots)
        print(f"Consolidated output: {CONSOLIDATED_DIR / 'latest.csv'}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
