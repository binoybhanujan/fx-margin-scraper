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


def compute_margin_pct_of_mid(
    rate: float | None,
    mid: float | None,
    *,
    customer_buys_fcy: bool,
) -> float | None:
    """Margin vs mid as a percent of mid. None if rate or mid is missing."""
    if rate is None or mid is None or mid == 0:
        return None
    if customer_buys_fcy:
        return (rate - mid) / mid * 100
    return (mid - rate) / mid * 100


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
