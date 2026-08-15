"""Export FX rate snapshots to CSV."""

from __future__ import annotations

import csv
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fx_scraper.models import FxRate, FxRatesSnapshot, RATE_COLUMNS, TIER_PREFIXES


def _consolidated_fieldnames() -> list[str]:
    fieldnames = [
        "bank",
        "currency",
        "unit",
        "group",
        "effective_date",
        "last_updated",
        "scraped_at",
    ]
    for prefix in TIER_PREFIXES.values():
        for col in RATE_COLUMNS:
            fieldnames.append(f"{prefix}_{col}")
    return fieldnames


def _snapshot_to_row(snapshot: FxRatesSnapshot) -> list[dict[str, Any]]:
    """Convert one bank snapshot to consolidated rows (one per currency)."""
    by_currency: dict[str, list[FxRate]] = {}
    for rate in snapshot.rates:
        by_currency.setdefault(rate.currency, []).append(rate)

    rows: list[dict[str, Any]] = []
    for currency, currency_rates in by_currency.items():
        row: dict[str, Any] = {
            "bank": snapshot.bank,
            "currency": currency,
            "unit": currency_rates[0].unit,
            "group": currency_rates[0].group,
            "effective_date": snapshot.effective_date,
            "last_updated": snapshot.last_updated,
            "scraped_at": snapshot.scraped_at,
        }
        for rate in currency_rates:
            prefix = TIER_PREFIXES.get(rate.amount_tier, rate.amount_tier)
            for col in RATE_COLUMNS:
                row[f"{prefix}_{col}"] = getattr(rate, col)
        rows.append(row)
    return rows


def save_bank_csv(snapshot: FxRatesSnapshot, path: Path) -> None:
    """Save a single-bank snapshot as consolidated CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = _consolidated_fieldnames()
    rows = _snapshot_to_row(snapshot)

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def save_consolidated_csv(snapshots: list[FxRatesSnapshot], path: Path) -> None:
    """Merge multiple bank snapshots into one consolidated CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = _consolidated_fieldnames()
    all_rows: list[dict[str, Any]] = []

    for snapshot in snapshots:
        all_rows.extend(_snapshot_to_row(snapshot))

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)


def save_long_csv(snapshots: list[FxRatesSnapshot], path: Path) -> None:
    """Save all rates in long format (one row per currency/tier). Useful for analytics."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "bank",
        "currency",
        "unit",
        "group",
        "amount_tier",
        "amount_tier_label",
        "effective_date",
        "last_updated",
        "scraped_at",
        "tt_od_sell",
        "tt_buy",
        "od_buy",
    ]

    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for snapshot in snapshots:
            for rate in snapshot.rates:
                row = asdict(rate)
                row["effective_date"] = snapshot.effective_date
                row["last_updated"] = snapshot.last_updated
                row["scraped_at"] = snapshot.scraped_at
                writer.writerow(row)
