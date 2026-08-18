"""Export FX rate snapshots to CSV."""

from __future__ import annotations

import csv
from dataclasses import asdict
from pathlib import Path
from typing import Any

from fx_scraper.models import FxRatesSnapshot, compute_margin_pct_of_mid
from fx_scraper.std_bands import build_standardized_rates

CSV_FIELDNAMES = [
    "record_type",
    "bank",
    "base_currency",
    "quote_currency",
    "currency_pair",
    "unit",
    "transaction_value",
    "amount_tier",
    "std_transaction_value",
    "std_amount_tier",
    "group",
    "effective_date",
    "last_updated",
    "scraped_at",
    "tt_od_sell",
    "tt_buy",
    "mid_rate",
    "sell_margin_pct",
    "buy_margin_pct",
]


def _rate_row(rate: Any, snapshot: FxRatesSnapshot) -> dict[str, Any]:
    row = asdict(rate)
    row["effective_date"] = snapshot.effective_date
    row["last_updated"] = snapshot.last_updated
    row["scraped_at"] = snapshot.scraped_at
    mid = rate.mid_rate
    row["sell_margin_pct"] = compute_margin_pct_of_mid(
        rate.tt_od_sell, mid, customer_buys_fcy=True
    )
    row["buy_margin_pct"] = compute_margin_pct_of_mid(
        rate.tt_buy, mid, customer_buys_fcy=False
    )
    return row


def _snapshot_rows(
    snapshot: FxRatesSnapshot,
    *,
    include_standardized: bool,
) -> list[dict[str, Any]]:
    rows = [_rate_row(rate, snapshot) for rate in snapshot.rates]
    if include_standardized:
        for rate in build_standardized_rates(snapshot):
            rows.append(_rate_row(rate, snapshot))
    return rows


def _write_csv(rows: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def save_bank_csv(snapshot: FxRatesSnapshot, path: Path) -> None:
    """Save a single-bank snapshot as CSV (native tiers only)."""
    _write_csv(_snapshot_rows(snapshot, include_standardized=False), path)


def save_consolidated_csv(snapshots: list[FxRatesSnapshot], path: Path) -> None:
    """Merge bank snapshots into one CSV with native and standardized tiers."""
    all_rows: list[dict[str, Any]] = []
    for snapshot in snapshots:
        all_rows.extend(_snapshot_rows(snapshot, include_standardized=True))
    all_rows.sort(
        key=lambda row: (
            row["record_type"],
            row["bank"],
            row["base_currency"],
            row.get("std_amount_tier") or row["amount_tier"],
        )
    )
    _write_csv(all_rows, path)
