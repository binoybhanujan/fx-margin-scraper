"""Export FX rate snapshots to CSV."""

from __future__ import annotations

import csv
import logging
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any

from fx_scraper.market import (
    MAS_SOURCE,
    MasRate,
    load_mas_rates_by_iso,
    mas_mid_in_bank_unit,
)
from fx_scraper.models import FxRatesSnapshot, compute_margin_pct_of_mid
from fx_scraper.std_bands import build_standardized_rates

logger = logging.getLogger(__name__)

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
    "bank_mid_rate",
    "mid_source",
    "sell_margin_pct",
    "buy_margin_pct",
]


def _parse_optional_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    return float(text)


def _existing_bank_mid(row: dict[str, Any]) -> float | None:
    """Bank-published or buy/sell-average mid. Never treat an MAS mid as the bank mid."""
    stored = _parse_optional_float(row.get("bank_mid_rate"))
    if stored is not None:
        return stored
    if str(row.get("mid_source") or "").strip().upper() == MAS_SOURCE:
        return None
    return _parse_optional_float(row.get("mid_rate"))


def _lookup_mas_mid(
    *,
    base_currency: str,
    quote_currency: str,
    bank_unit: int,
    mas_by_iso: dict[str, MasRate] | None,
) -> tuple[float | None, str]:
    """Return (MAS mid in bank unit, source). Empty when MAS has no published print."""
    if not mas_by_iso:
        return None, ""
    if (quote_currency or "").strip().upper() != "SGD":
        return None, ""
    iso = (base_currency or "").strip().upper()
    if not iso:
        return None, ""
    mas = mas_by_iso.get(iso)
    if mas is None:
        return None, ""
    scaled = mas_mid_in_bank_unit(mas, bank_unit)
    if scaled is None:
        return None, ""
    return scaled, MAS_SOURCE


def apply_mas_mid_fields(
    row: dict[str, Any],
    mas_by_iso: dict[str, MasRate] | None,
    *,
    bank_mid: float | None,
) -> dict[str, Any]:
    """Set mid/margins from MAS only. Do not fall back to bank mid or T-1."""
    try:
        bank_unit = int(_parse_optional_float(row.get("unit")) or 0)
    except (TypeError, ValueError):
        bank_unit = 0
    mas_mid, mid_source = _lookup_mas_mid(
        base_currency=str(row.get("base_currency") or ""),
        quote_currency=str(row.get("quote_currency") or ""),
        bank_unit=bank_unit,
        mas_by_iso=mas_by_iso,
    )
    row["bank_mid_rate"] = bank_mid
    row["mid_rate"] = mas_mid
    row["mid_source"] = mid_source
    row["sell_margin_pct"] = compute_margin_pct_of_mid(
        _parse_optional_float(row.get("tt_od_sell")),
        mas_mid,
        customer_buys_fcy=True,
    )
    row["buy_margin_pct"] = compute_margin_pct_of_mid(
        _parse_optional_float(row.get("tt_buy")),
        mas_mid,
        customer_buys_fcy=False,
    )
    return row


def _rate_row(
    rate: Any,
    snapshot: FxRatesSnapshot,
    mas_by_iso: dict[str, MasRate] | None,
) -> dict[str, Any]:
    row = asdict(rate)
    row["effective_date"] = snapshot.effective_date
    row["last_updated"] = snapshot.last_updated
    row["scraped_at"] = snapshot.scraped_at
    return apply_mas_mid_fields(row, mas_by_iso, bank_mid=rate.mid_rate)


def _snapshot_rows(
    snapshot: FxRatesSnapshot,
    *,
    include_standardized: bool,
    mas_by_iso: dict[str, MasRate] | None,
) -> list[dict[str, Any]]:
    rows = [_rate_row(rate, snapshot, mas_by_iso) for rate in snapshot.rates]
    if include_standardized:
        for rate in build_standardized_rates(snapshot):
            rows.append(_rate_row(rate, snapshot, mas_by_iso))
    return rows


def _write_csv(rows: list[dict[str, Any]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def save_bank_csv(snapshot: FxRatesSnapshot, path: Path) -> None:
    """Save a single-bank snapshot as CSV (native tiers, bank mid only)."""
    rows = []
    for rate in snapshot.rates:
        row = asdict(rate)
        row["effective_date"] = snapshot.effective_date
        row["last_updated"] = snapshot.last_updated
        row["scraped_at"] = snapshot.scraped_at
        row["bank_mid_rate"] = rate.mid_rate
        row["mid_source"] = "bank"
        row["sell_margin_pct"] = compute_margin_pct_of_mid(
            rate.tt_od_sell, rate.mid_rate, customer_buys_fcy=True
        )
        row["buy_margin_pct"] = compute_margin_pct_of_mid(
            rate.tt_buy, rate.mid_rate, customer_buys_fcy=False
        )
        rows.append(row)
    _write_csv(rows, path)


def save_consolidated_csv(
    snapshots: list[FxRatesSnapshot],
    path: Path,
    mas_by_iso: dict[str, MasRate] | None = None,
) -> None:
    """Merge bank snapshots; margins vs same-day MAS mid when published."""
    all_rows: list[dict[str, Any]] = []
    for snapshot in snapshots:
        all_rows.extend(
            _snapshot_rows(
                snapshot,
                include_standardized=True,
                mas_by_iso=mas_by_iso,
            )
        )
    all_rows.sort(
        key=lambda row: (
            row["record_type"],
            row["bank"],
            row["base_currency"],
            row.get("std_amount_tier") or row["amount_tier"],
        )
    )
    _write_csv(all_rows, path)


def rewrite_consolidated_margins(consolidated_dir: Path, market_dir: Path) -> int:
    """Recompute mid/margins on dated consolidated CSVs from stored board rates."""
    dated_paths = sorted(
        path
        for path in consolidated_dir.glob("*.csv")
        if path.stem != "latest" and not path.stem.endswith("_long")
    )
    rewritten = 0
    for path in dated_paths:
        try:
            day = date.fromisoformat(path.stem)
        except ValueError:
            continue
        mas_by_iso = load_mas_rates_by_iso(market_dir, day)
        with path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        updated = [
            apply_mas_mid_fields(row, mas_by_iso, bank_mid=_existing_bank_mid(row))
            for row in rows
        ]
        _write_csv(updated, path)
        rewritten += 1
        logger.info(
            "Re-exported %s with %s MAS currency(ies)",
            path.name,
            len(mas_by_iso),
        )

    if dated_paths:
        latest_src = dated_paths[-1]
        (consolidated_dir / "latest.csv").write_text(
            latest_src.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    return rewritten
