"""Orchestrate scraping from all registered banks."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import date
from pathlib import Path

from fx_scraper.banks import SCRAPERS
from fx_scraper.exporter import (
    rewrite_consolidated_margins,
    save_bank_csv,
    save_consolidated_csv,
)
from fx_scraper.market import (
    earliest_consolidated_date,
    is_weekend,
    load_mas_rates_by_iso,
    singapore_today,
    sync_mas_daily_rates,
)
from fx_scraper.models import FxRatesSnapshot

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CONSOLIDATED_DIR = DATA_DIR / "consolidated"
MARKET_DIR = DATA_DIR / "market"


def _write_consolidated_index(consolidated_dir: Path) -> None:
    """Write index.json listing dated consolidated CSV files for the dashboard."""
    dates = sorted(
        p.stem for p in consolidated_dir.glob("*.csv")
        if p.stem != "latest" and not p.stem.endswith("_long")
    )
    index = {
        "latest": "latest.csv",
        "dates": dates,
    }
    (consolidated_dir / "index.json").write_text(
        json.dumps(index, indent=2),
        encoding="utf-8",
    )


def run_mas_sync(data_dir: Path | None = None) -> list[date]:
    """Backfill MAS daily rates from the first bank-rate date through Singapore today.

    Weekends are skipped: MAS does not publish Saturday/Sunday figures.
    Singapore holidays (and not-yet-published days) are stored only when MAS
    returns a row — previous days are not carried forward.
    """
    root = data_dir or DATA_DIR
    today = singapore_today()
    if is_weekend(today):
        logger.info(
            "Weekend in Singapore (%s): MAS has no daily print; backfilling weekdays only",
            today.isoformat(),
        )

    start = earliest_consolidated_date(root / "consolidated") or today
    written = sync_mas_daily_rates(
        root / "market",
        start=start,
        end=today,
        skip_weekends=True,
    )
    logger.info(
        "MAS daily rates: %d file(s) %s .. %s -> %s",
        len(written),
        start.isoformat(),
        today.isoformat(),
        root / "market",
    )
    return written


def run_all_scrapers(
    data_dir: Path | None = None,
    *,
    scrape_banks: bool = True,
    scrape_mas: bool = True,
) -> list[FxRatesSnapshot]:
    """Run every registered bank scraper and persist per-bank + consolidated outputs."""
    raw_dir = (data_dir or DATA_DIR) / "raw"
    root = data_dir or DATA_DIR
    consolidated_dir = root / "consolidated"
    today = date.today().isoformat()

    snapshots: list[FxRatesSnapshot] = []
    errors: list[str] = []

    if scrape_mas:
        try:
            run_mas_sync(root)
        except Exception as exc:
            msg = f"MAS: {exc}"
            logger.error(msg)
            errors.append(msg)

    market_dir = root / "market"
    mas_today = load_mas_rates_by_iso(market_dir, date.fromisoformat(today))

    if not scrape_banks:
        rewrite_consolidated_margins(consolidated_dir, market_dir)
        if errors:
            raise RuntimeError(
                f"Scraping completed with errors ({len(errors)}): " + "; ".join(errors)
            )
        return snapshots

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
                len({r.base_currency for r in snapshot.rates}),
                len(snapshot.rates),
            )
        except Exception as exc:
            msg = f"{scraper.name}: {exc}"
            logger.error(msg)
            errors.append(msg)

    if snapshots:
        save_consolidated_csv(
            snapshots,
            consolidated_dir / f"{today}.csv",
            mas_by_iso=mas_today,
        )
        _write_consolidated_index(consolidated_dir)
        logger.info(
            "Consolidated %d bank(s) -> %s",
            len(snapshots),
            consolidated_dir / f"{today}.csv",
        )

    rewrite_consolidated_margins(consolidated_dir, market_dir)

    if errors:
        raise RuntimeError(
            f"Scraping completed with errors ({len(errors)}): " + "; ".join(errors)
        )

    return snapshots


def print_summary(snapshots: list[FxRatesSnapshot]) -> None:
    for snapshot in snapshots:
        currencies = sorted({r.base_currency for r in snapshot.rates})
        print(f"Bank:          {snapshot.bank}")
        print(f"Source:        {snapshot.source_url}")
        print(f"Effective:     {snapshot.effective_date}")
        print(f"Last updated:  {snapshot.last_updated}")
        print(f"Scraped at:    {snapshot.scraped_at}")
        print(f"Currencies:    {len(currencies)}")
        print(f"Rate rows:     {len(snapshot.rates)}")
        print()
