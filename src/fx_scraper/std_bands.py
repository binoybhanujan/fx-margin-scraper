"""Standardized transaction bands and mapping from bank-native tiers."""

from __future__ import annotations

from dataclasses import dataclass

from fx_scraper.models import FxRate, FxRatesSnapshot


@dataclass(frozen=True)
class StandardizedTier:
    key: str
    label: str
    min_sgd: float
    max_sgd: float

    @property
    def midpoint_sgd(self) -> float:
        return (self.min_sgd + self.max_sgd) / 2


# Four canonical SGD-equivalent bands for cross-bank comparison.
STANDARDIZED_TIERS: tuple[StandardizedTier, ...] = (
    StandardizedTier("std_lt_50", "SGD < 50", 0, 49.99),
    StandardizedTier("std_50_200", "SGD 50 – 200", 50, 200),
    StandardizedTier("std_200_40k", "SGD 200 – 39,999.99", 200.01, 39999.99),
    StandardizedTier("std_40k_100k", "SGD 40,000 – 100,000", 40000, 100000),
)

# SGD-equivalent ranges for each bank's native amount tiers.
NATIVE_TIER_RANGES: dict[str, dict[str, tuple[float, float]]] = {
    "dbs": {
        "amtLessThan50": (0, 49.99),
        "amtBtw50And200": (50, 200),
    },
    "ocbc": {
        "tier_1": (0, 39999.99),
        "tier_2": (40000, 100000),
    },
}


def _native_tier_for_midpoint(bank: str, midpoint_sgd: float) -> str | None:
    ranges = NATIVE_TIER_RANGES.get(bank, {})
    for tier_key, (min_sgd, max_sgd) in ranges.items():
        if min_sgd <= midpoint_sgd <= max_sgd:
            return tier_key
    return None


def build_standardized_rates(snapshot: FxRatesSnapshot) -> list[FxRate]:
    """Map each currency to standardized bands using the bank tier that applies at band midpoint."""
    by_currency_tier: dict[tuple[str, str], FxRate] = {}
    for rate in snapshot.rates:
        by_currency_tier[(rate.base_currency, rate.amount_tier)] = rate

    currencies = sorted({r.base_currency for r in snapshot.rates})
    standardized: list[FxRate] = []

    for currency in currencies:
        for std_tier in STANDARDIZED_TIERS:
            native_tier_key = _native_tier_for_midpoint(
                snapshot.bank, std_tier.midpoint_sgd
            )
            if native_tier_key is None:
                continue
            source = by_currency_tier.get((currency, native_tier_key))
            if source is None:
                continue
            standardized.append(
                FxRate(
                    record_type="standardized",
                    bank=source.bank,
                    base_currency=source.base_currency,
                    quote_currency=source.quote_currency,
                    currency_pair=source.currency_pair,
                    unit=source.unit,
                    group=source.group,
                    amount_tier=source.amount_tier,
                    transaction_value=source.transaction_value,
                    std_amount_tier=std_tier.key,
                    std_transaction_value=std_tier.label,
                    tt_od_sell=source.tt_od_sell,
                    tt_buy=source.tt_buy,
                    od_buy=source.od_buy,
                    mid_rate=source.mid_rate,
                )
            )

    return standardized
