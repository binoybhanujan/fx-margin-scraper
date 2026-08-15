"""Export FX rate snapshots to CSV."""

from __future__ import annotations

import csv
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fx_scraper.models import FxRatesSnapshot

CSV_FIELDNAMES = [
    "bank",
    "base_currency",
    "quote_currency",
    "currency_pair",
    "unit",
    "transaction_value",
    "amount_tier",
    "group",
    "effective_date",
    "last_updated",
    "scraped_at",
    "tt_od_sell",
    "tt_buy",
    "od_buy",
]


def _rate_rows(snapshot: FxRatesSnapshot) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for rate in snapshot.rates:
        row = asdict(rate)
        row["effective_date"] = snapshot.effective_date
        row["last_updated"] = snapshot.last_updated
        row["scraped_at"] = snapshot.scraped_at
        rows.append(row)
    return rows


def _write_csv(rows: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def save_bank_csv(snapshot: FxRatesSnapshot, path: Path) -> None:
    """Save a single-bank snapshot as CSV (one row per currency pair + transaction tier)."""
    _write_csv(_rate_rows(snapshot), path)


def save_consolidated_csv(snapshots: list[FxRatesSnapshot], path: Path) -> None:
    """Merge multiple bank snapshots into one consolidated CSV."""
    all_rows: list[dict[str, Any]] = []
    for snapshot in snapshots:
        all_rows.extend(_rate_rows(snapshot))
    _write_csv(all_rows, path)
