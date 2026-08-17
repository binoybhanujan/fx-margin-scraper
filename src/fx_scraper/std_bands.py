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


# Four canonical SGD-equivalent bands for cross-bank comparison.
STANDARDIZED_TIERS: tuple[StandardizedTier, ...] = (
    StandardizedTier("std_lt_50", "SGD < 50", 0, 49.99),
    StandardizedTier("std_50_200", "SGD 50 – 200", 50, 200),
    StandardizedTier("std_200_40k", "SGD 200 – 39,999.99", 200.01, 39999.99),
    StandardizedTier("std_40k_100k", "SGD 40,000 – 100,000", 40000, 100000),
)

# Native amount_tier to use for each standardized band. DBS has no published
# tier above SGD 200, so larger bands fall back to amtBtw50And200.
STANDARDIZED_TIER_NATIVE_MAP: dict[str, dict[str, str]] = {
    "dbs": {
        "std_lt_50": "amtLessThan50",
        "std_50_200": "amtBtw50And200",
        "std_200_40k": "amtBtw50And200",
        "std_40k_100k": "amtBtw50And200",
    },
    "ocbc": {
        "std_lt_50": "tier_1",
        "std_50_200": "tier_1",
        "std_200_40k": "tier_1",
        "std_40k_100k": "tier_2",
    },
    "uob": {
        "std_lt_50": "board",
        "std_50_200": "board",
        "std_200_40k": "board",
        "std_40k_100k": "board",
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
                    od_buy=source.od_buy,
                    mid_rate=source.mid_rate,
                )
            )

    return standardized
