"""Shared data models for FX rate scraping."""

from __future__ import annotations

from dataclasses import dataclass

RATE_COLUMNS: list[str] = ["tt_od_sell", "tt_buy", "od_buy", "mid_rate"]


def compute_mid_rate(
    tt_od_sell: float | None,
    tt_buy: float | None,
    published_mid: float | None = None,
) -> float | None:
    """Mid rate: bank-published value, or average of buy/sell when both exist."""
    if published_mid is not None:
        return published_mid
    if tt_od_sell is not None and tt_buy is not None:
        return (tt_od_sell + tt_buy) / 2
    return None


@dataclass
class FxRate:
    record_type: str  # "native" | "standardized"
    bank: str
    base_currency: str
    quote_currency: str
    currency_pair: str
    unit: int
    group: str
    amount_tier: str
    transaction_value: str
    std_amount_tier: str | None
    std_transaction_value: str | None
    tt_od_sell: float | None
    tt_buy: float | None
    od_buy: float | None
    mid_rate: float | None


@dataclass
class FxRatesSnapshot:
    bank: str
    source_url: str
    effective_date: str
    last_updated: str
    scraped_at: str
    rates: list[FxRate]
