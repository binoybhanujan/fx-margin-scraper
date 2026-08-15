"""Shared data models for FX rate scraping."""

from __future__ import annotations

from dataclasses import dataclass

# SGD equivalent transaction value tiers used by DBS (and likely others).
AMOUNT_TIERS: dict[str, str] = {
    "amtLessThan50": "SGD < 50",
    "amtBtw50And200": "SGD 50 – 200",
}

RATE_COLUMNS: list[str] = ["tt_od_sell", "tt_buy", "od_buy"]


@dataclass
class FxRate:
    bank: str
    base_currency: str
    quote_currency: str
    currency_pair: str
    unit: int
    group: str
    amount_tier: str
    transaction_value: str
    tt_od_sell: float | None
    tt_buy: float | None
    od_buy: float | None


@dataclass
class FxRatesSnapshot:
    bank: str
    source_url: str
    effective_date: str
    last_updated: str
    scraped_at: str
    rates: list[FxRate]
