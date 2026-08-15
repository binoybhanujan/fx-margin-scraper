"""Orchestrate scraping from all registered banks."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import date
from pathlib import Path

from fx_scraper.banks import SCRAPERS
from fx_scraper.exporter import save_bank_csv, save_consolidated_csv, save_long_csv
from fx_scraper.models import FxRatesSnapshot

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CONSOLIDATED_DIR = DATA_DIR / "consolidated"


def run_all_scrapers(
    data_dir: Path | None = None,
) -> list[FxRatesSnapshot]:
    """Run every registered bank scraper and persist per-bank + consolidated outputs."""
    raw_dir = (data_dir or DATA_DIR) / "raw"
    consolidated_dir = (data_dir or DATA_DIR) / "consolidated"
    today = date.today().isoformat()

    snapshots: list[FxRatesSnapshot] = []
    errors: list[str] = []

    for scraper in SCRAPERS:
        logger.info("Scraping %s...", scraper.name)
        try:
            snapshot = scraper.fetch()
            snapshots.append(snapshot)

            bank_dir = raw_dir / scraper.name
            save_bank_csv(snapshot, bank_dir / f"{today}.csv")
            (bank_dir / f"{today}.json").write_text(
                json.dumps(asdict(snapshot), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            logger.info(
                "%s: %d currencies, %d rate rows",
                scraper.name,
                len({r.currency for r in snapshot.rates}),
                len(snapshot.rates),
            )
        except Exception as exc:
            msg = f"{scraper.name}: {exc}"
            logger.error(msg)
            errors.append(msg)

    if snapshots:
        save_consolidated_csv(snapshots, consolidated_dir / f"{today}.csv")
        save_long_csv(snapshots, consolidated_dir / f"{today}_long.csv")
        save_consolidated_csv(snapshots, consolidated_dir / "latest.csv")
        save_long_csv(snapshots, consolidated_dir / "latest_long.csv")
        logger.info(
            "Consolidated %d bank(s) -> %s",
            len(snapshots),
            consolidated_dir / "latest.csv",
        )

    if errors:
        raise RuntimeError(
            f"Scraping completed with errors ({len(errors)}): " + "; ".join(errors)
        )

    return snapshots


def print_summary(snapshots: list[FxRatesSnapshot]) -> None:
    for snapshot in snapshots:
        currencies = sorted({r.currency for r in snapshot.rates})
        print(f"Bank:          {snapshot.bank}")
        print(f"Source:        {snapshot.source_url}")
        print(f"Effective:     {snapshot.effective_date}")
        print(f"Last updated:  {snapshot.last_updated}")
        print(f"Scraped at:    {snapshot.scraped_at}")
        print(f"Currencies:    {len(currencies)}")
        print(f"Rate rows:     {len(snapshot.rates)}")
        print()
