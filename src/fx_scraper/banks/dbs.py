"""DBS Singapore FX rate scraper."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from fx_scraper.banks.base import BankScraper
from fx_scraper.models import AMOUNT_TIERS, FxRate, FxRatesSnapshot

API_URL = "https://www.dbs.com.sg/sg-rates-api/v1/api/sgrates/getSGFXRates"
SOURCE_URL = (
    "https://www.dbs.com.sg/personal/rates-online/"
    "foreign-currency-foreign-exchange.page"
)
QUOTE_CURRENCY = "SGD"


def _parse_float(value: str) -> float | None:
    parsed = float(value)
    return parsed if parsed != 0.0 else None


class DbsScraper(BankScraper):
    name = "dbs"
    quote_currency = QUOTE_CURRENCY

    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch(self) -> FxRatesSnapshot:
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        response = requests.get(
            API_URL,
            params={"FETCH_LATEST": timestamp_ms},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return self._extract(response.json())

    def _extract(self, raw: dict[str, Any]) -> FxRatesSnapshot:
        rec_data = raw["results"]["assets"][0]["recData"][0]

        effective_date = ""
        last_updated = ""
        rates: list[FxRate] = []

        for group_name in ("mainCurrencies", "otherCurrencies"):
            group = rec_data[group_name]
            if group.get("effectiveDate", "") > effective_date:
                effective_date = group["effectiveDate"]
            if group.get("lastUpdated", "") > last_updated:
                last_updated = group["lastUpdated"]

            for entry in group.get("rates", []):
                base_currency = entry["currency"]
                unit = int(entry["unit"])
                currency_pair = f"{base_currency}/{self.quote_currency}"

                for tier_key, tier_label in AMOUNT_TIERS.items():
                    tier_data = entry.get(tier_key, {})
                    rates.append(
                        FxRate(
                            bank=self.name,
                            base_currency=base_currency,
                            quote_currency=self.quote_currency,
                            currency_pair=currency_pair,
                            unit=unit,
                            group=group_name,
                            amount_tier=tier_key,
                            transaction_value=tier_label,
                            tt_od_sell=_parse_float(tier_data.get("ttodSell", "0")),
                            tt_buy=_parse_float(tier_data.get("ttBuy", "0")),
                            od_buy=_parse_float(tier_data.get("odBuy", "0")),
                        )
                    )

        return FxRatesSnapshot(
            bank=self.name,
            source_url=SOURCE_URL,
            effective_date=effective_date,
            last_updated=last_updated,
            scraped_at=datetime.now(timezone.utc).isoformat(),
            rates=rates,
        )
