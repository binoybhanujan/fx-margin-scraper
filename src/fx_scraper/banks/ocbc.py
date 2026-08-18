"""OCBC Singapore FX rate scraper."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from fx_scraper.banks.base import BankScraper
from fx_scraper.models import FxRate, FxRatesSnapshot, compute_mid_rate

API_URL = "https://www.ocbc.com/FXRates/bootstrap.json"
SOURCE_URL = "https://www.ocbc.com/business-banking/foreign-exchange-rates"
QUOTE_CURRENCY = "SGD"
GROUP_NAME = "fxRatesSgd"


def _format_amount(amount: float) -> str:
    if amount == int(amount):
        return f"{int(amount):,}"
    return f"{amount:,.2f}"


def _tier_label(quote_currency: str, min_amount: float, max_amount: float) -> str:
    return f"{quote_currency} {_format_amount(min_amount)} – {_format_amount(max_amount)}"


def _tier_key(tier_level: int) -> str:
    return f"tier_{tier_level}"


def _parse_tier_configs(raw: dict[str, Any]) -> dict[int, dict[str, Any]]:
    configs: dict[int, dict[str, Any]] = {}
    for entry in raw.get("tieredAmountConfigForSgd", []):
        configs[int(entry["tierLevel"])] = entry
    return configs


class OcbcScraper(BankScraper):
    name = "ocbc"
    quote_currency = QUOTE_CURRENCY

    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch(self) -> FxRatesSnapshot:
        response = requests.get(
            API_URL,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return self._extract(response.json())

    def _extract(self, raw: dict[str, Any]) -> FxRatesSnapshot:
        last_updated = raw.get("lastUpdated", "")
        tier_configs = _parse_tier_configs(raw)
        rates: list[FxRate] = []

        for entry in raw.get("fxRatesSgd", []):
            base_currency = entry["baseCurrencyCode"]
            quote_currency = entry["exchangeCurrencyCode"]
            unit = int(entry.get("unitForSGDExchange", 1))
            currency_pair = f"{base_currency}/{quote_currency}"
            published_mid = float(entry["middleExchangeRate"])

            for tier_rate in entry.get("tieredExchangeRates", []):
                tier_level = int(tier_rate["tierLevel"])
                tier_config = tier_configs.get(tier_level, {})
                min_amount = float(tier_config.get("minAmount", 0))
                max_amount = float(tier_config.get("maxAmount", 0))
                transaction_value = _tier_label(quote_currency, min_amount, max_amount)
                tt_od_sell = float(tier_rate["bankSellRate"])
                tt_buy = float(tier_rate["bankBuyRate"])

                rates.append(
                    FxRate(
                        record_type="native",
                        bank=self.name,
                        base_currency=base_currency,
                        quote_currency=quote_currency,
                        currency_pair=currency_pair,
                        unit=unit,
                        group=GROUP_NAME,
                        amount_tier=_tier_key(tier_level),
                        transaction_value=transaction_value,
                        std_amount_tier=None,
                        std_transaction_value=None,
                        tt_od_sell=tt_od_sell,
                        tt_buy=tt_buy,
                        mid_rate=compute_mid_rate(
                            tt_od_sell, tt_buy, published_mid=published_mid
                        ),
                    )
                )

        return FxRatesSnapshot(
            bank=self.name,
            source_url=SOURCE_URL,
            effective_date=last_updated,
            last_updated=last_updated,
            scraped_at=datetime.now(timezone.utc).isoformat(),
            rates=rates,
        )
