"""UOB Singapore FX rate scraper."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from fx_scraper.banks.base import BankScraper
from fx_scraper.models import FxRate, FxRatesSnapshot, compute_mid_rate

API_URL = "https://www.uobgroup.com/data-api-rates/data-api/forex"
DCR_PATH = "/online-rates/data/foreign-exchange-rates-against-singapore-dollar"
SOURCE_URL = (
    "https://www.uobgroup.com/online-rates/"
    "foreign-exchange-rates-against-singapore-dollar.page"
)
QUOTE_CURRENCY = "SGD"
GROUP_NAME = "forex_sgd"
NATIVE_TIER_KEY = "board"
NATIVE_TIER_LABEL = "Indicative board"


def _parse_float(value: str | None) -> float | None:
    if value is None or str(value).strip() == "":
        return None
    parsed = float(value)
    return parsed if parsed != 0.0 else None


class UobScraper(BankScraper):
    name = "uob"
    quote_currency = QUOTE_CURRENCY

    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch(self) -> FxRatesSnapshot:
        response = requests.get(
            API_URL,
            params={"dcr": DCR_PATH},
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return self._extract(response.json())

    def _extract(self, raw: dict[str, Any]) -> FxRatesSnapshot:
        last_updated = str(raw.get("currentDate") or "")
        rates: list[FxRate] = []

        for entry in raw.get("types") or []:
            base_currency = str(entry["code"]).strip()
            unit = int(entry.get("unit") or 1)
            currency_pair = f"{base_currency}/{self.quote_currency}"
            tt_od_sell = _parse_float(entry.get("bankSell"))
            tt_buy = _parse_float(entry.get("bankBuy"))
            rates.append(
                FxRate(
                    record_type="native",
                    bank=self.name,
                    base_currency=base_currency,
                    quote_currency=self.quote_currency,
                    currency_pair=currency_pair,
                    unit=unit,
                    group=GROUP_NAME,
                    amount_tier=NATIVE_TIER_KEY,
                    transaction_value=NATIVE_TIER_LABEL,
                    std_amount_tier=None,
                    std_transaction_value=None,
                    tt_od_sell=tt_od_sell,
                    tt_buy=tt_buy,
                    mid_rate=compute_mid_rate(tt_od_sell, tt_buy),
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
