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


# Five canonical SGD-equivalent bands for cross-bank comparison.
STANDARDIZED_TIERS: tuple[StandardizedTier, ...] = (
    StandardizedTier("std_0_14k", "SGD 0 – 14,000", 0, 14000),
    StandardizedTier("std_14k_28k", "SGD 14,000 – 28,000", 14000.01, 28000),
    StandardizedTier("std_28k_70k", "SGD 28,000 – 70,000", 28000.01, 70000),
    StandardizedTier("std_70k_280k", "SGD 70,000 – 280,000", 70000.01, 280000),
    StandardizedTier("std_280k_plus", "SGD 280,000+", 280000.01, float("inf")),
)

# Native amount_tier to use for each standardized band. DBS's public converter
# uses amtLessThan50 for any amount, so every standardized band maps to that.
# OCBC tier_2 starts at SGD 40,000; bands from 28k upward use that published tier.
STANDARDIZED_TIER_NATIVE_MAP: dict[str, dict[str, str]] = {
    "dbs": {
        "std_0_14k": "amtLessThan50",
        "std_14k_28k": "amtLessThan50",
        "std_28k_70k": "amtLessThan50",
        "std_70k_280k": "amtLessThan50",
        "std_280k_plus": "amtLessThan50",
    },
    "ocbc": {
        "std_0_14k": "tier_1",
        "std_14k_28k": "tier_1",
        "std_28k_70k": "tier_2",
        "std_70k_280k": "tier_2",
        "std_280k_plus": "tier_2",
    },
    "uob": {
        "std_0_14k": "board",
        "std_14k_28k": "board",
        "std_28k_70k": "board",
        "std_70k_280k": "board",
        "std_280k_plus": "board",
    },
    "hsbc": {
        "std_0_14k": "board",
        "std_14k_28k": "board",
        "std_28k_70k": "board",
        "std_70k_280k": "board",
        "std_280k_plus": "board",
    },
}


def build_standardized_rates(snapshot: FxRatesSnapshot) -> list[FxRate]:
    """Map each currency onto all standardized bands via the explicit native-tier map."""
    by_currency_tier: dict[tuple[str, str], FxRate] = {}
    for rate in snapshot.rates:
        by_currency_tier[(rate.base_currency, rate.amount_tier)] = rate

    bank_map = STANDARDIZED_TIER_NATIVE_MAP.get(snapshot.bank, {})
    currencies = sorted({r.base_currency for r in snapshot.rates})
    standardized: list[FxRate] = []

    for currency in currencies:
        for std_tier in STANDARDIZED_TIERS:
            native_tier_key = bank_map.get(std_tier.key)
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
                    mid_rate=source.mid_rate,
                )
            )

    return standardized
