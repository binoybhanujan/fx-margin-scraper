"""HSBC Singapore indicative FX rate scraper (HTML tables)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup, Tag

from fx_scraper.banks.base import BankScraper
from fx_scraper.models import FxRate, FxRatesSnapshot, compute_mid_rate

SOURCE_URL = (
    "https://www.business.hsbc.com.sg/en-sg/solutions/"
    "exchange-rates-and-prime-lending-rates"
)
QUOTE_CURRENCY = "SGD"
GROUP_NAME = "indicative_fx"
NATIVE_TIER_KEY = "board"
NATIVE_TIER_LABEL = "Indicative board"

_CURRENCY_CODE = re.compile(r"^[A-Z]{3}$")
_UNIT_1_HEADER = "S$ to 1 unit of foreign currency"
_UNIT_100_HEADER = "S$ to 100 units of foreign currency"


def _parse_float(value: str | None) -> float | None:
    if value is None:
        return None
    cleaned = value.strip().replace(",", "")
    if cleaned == "":
        return None
    parsed = float(cleaned)
    return parsed if parsed != 0.0 else None


def _cell_text(cell: Tag) -> str:
    return cell.get_text(" ", strip=True)


def _table_unit(table: Tag) -> int | None:
    header = table.find("th")
    if header is None:
        return None
    text = _cell_text(header)
    if _UNIT_100_HEADER in text:
        return 100
    if _UNIT_1_HEADER in text:
        return 1
    return None


def _last_updated_after(table: Tag) -> str:
    for sibling in table.find_all_next("p"):
        text = sibling.get_text(" ", strip=True)
        if text.lower().startswith("last updated:"):
            return text.split(":", 1)[1].strip()
    return ""


class HsbcScraper(BankScraper):
    name = "hsbc"
    quote_currency = QUOTE_CURRENCY

    def __init__(self, timeout: float = 30.0) -> None:
        self.timeout = timeout

    def fetch(self) -> FxRatesSnapshot:
        response = requests.get(
            SOURCE_URL,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return self._extract(response.text)

    def _extract(self, html: str) -> FxRatesSnapshot:
        soup = BeautifulSoup(html, "html.parser")
        rates: list[FxRate] = []
        last_fx_table: Tag | None = None

        for table in soup.find_all("table"):
            unit = _table_unit(table)
            if unit is None:
                continue
            last_fx_table = table
            tbody = table.find("tbody")
            if tbody is None:
                continue
            for row in tbody.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) < 4:
                    continue
                base_currency = _cell_text(cells[1]).strip()
                if not _CURRENCY_CODE.match(base_currency):
                    continue
                if base_currency == self.quote_currency:
                    continue
                tt_od_sell = _parse_float(_cell_text(cells[2]))
                tt_buy = _parse_float(_cell_text(cells[3]))
                if tt_od_sell is None and tt_buy is None:
                    continue
                rates.append(
                    FxRate(
                        record_type="native",
                        bank=self.name,
                        base_currency=base_currency,
                        quote_currency=self.quote_currency,
                        currency_pair=f"{base_currency}/{self.quote_currency}",
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

        if not rates:
            raise ValueError("No HSBC indicative FX rows found in page HTML")

        last_updated = (
            _last_updated_after(last_fx_table) if last_fx_table is not None else ""
        )
        return FxRatesSnapshot(
            bank=self.name,
            source_url=SOURCE_URL,
            effective_date=last_updated,
            last_updated=last_updated,
            scraped_at=datetime.now(timezone.utc).isoformat(),
            rates=rates,
        )
