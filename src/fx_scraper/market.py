"""MAS daily SGD exchange rates (midday Singapore interbank average).

MAS's JSON datastore API currently serves a maintenance page. Daily figures
are downloaded from the official statistics form (CSV), which lists every
currency MAS publishes. Rates are stored as published; missing days (weekends
and Singapore holidays) are not filled in.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

MAS_PAGE_URL = "https://eservices.mas.gov.sg/Statistics/msb/ExchangeRates.aspx"
MAS_SOURCE = "MAS"
QUOTE_CURRENCY = "SGD"
SINGAPORE_UTC_OFFSET = timedelta(hours=8)
USER_AGENT = "fx-margin-scraper/0.1 (MAS daily exchange-rate download)"

HEADER_RE = re.compile(
    r"S\$ Per (Unit|100 Units) of (.+)$",
    re.IGNORECASE,
)

MONTH_NUMBER = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}

# ISO codes for names as they appear on the MAS Exchange Rates page.
MAS_CURRENCY_ISO = {
    "Euro": "EUR",
    "Pound Sterling": "GBP",
    "US Dollar": "USD",
    "Australian Dollar": "AUD",
    "Canadian Dollar": "CAD",
    "Chinese Renminbi": "CNY",
    "Hong Kong Dollar": "HKD",
    "Indian Rupee": "INR",
    "Indonesian Rupiah": "IDR",
    "Japanese Yen": "JPY",
    "Korean Won": "KRW",
    "Malaysian Ringgit": "MYR",
    "New Taiwan Dollar": "TWD",
    "New Zealand Dollar": "NZD",
    "Philippine Peso": "PHP",
    "Qatar Riyal": "QAR",
    "Saudi Arabia Riyal": "SAR",
    "Swiss Franc": "CHF",
    "Thai Baht": "THB",
    "UAE Dirham": "AED",
    "Vietnamese Dong": "VND",
}

CSV_FIELDNAMES = [
    "date",
    "source",
    "source_url",
    "frequency",
    "mas_currency",
    "base_currency",
    "quote_currency",
    "unit",
    "sgd_per_unit",
    "scraped_at",
]


@dataclass(frozen=True)
class MasRate:
    date: date
    mas_currency: str
    base_currency: str | None
    unit: int
    sgd_per_unit: float


def singapore_today() -> date:
    # Singapore has no DST; UTC+8 avoids the tzdata package on Windows.
    return (datetime.now(timezone.utc) + SINGAPORE_UTC_OFFSET).date()


def is_weekend(day: date) -> bool:
    return day.weekday() >= 5


def _parse_csv_float(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return float(text)


def load_mas_rates_by_iso(market_dir: Path, day: date) -> dict[str, MasRate]:
    """Load published MAS rates for one calendar day, keyed by ISO code.

    Missing files, weekends, and currencies without an ISO code yield no entry.
    Callers must not invent a substitute rate.
    """
    path = market_dir / f"{day.isoformat()}.csv"
    if not path.is_file():
        return {}

    rates: dict[str, MasRate] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            iso = (row.get("base_currency") or "").strip().upper()
            if not iso:
                continue
            unit_raw = _parse_csv_float(row.get("unit"))
            sgd_per_unit = _parse_csv_float(row.get("sgd_per_unit"))
            if unit_raw is None or unit_raw <= 0 or sgd_per_unit is None:
                continue
            rates[iso] = MasRate(
                date=day,
                mas_currency=(row.get("mas_currency") or "").strip(),
                base_currency=iso,
                unit=int(unit_raw),
                sgd_per_unit=sgd_per_unit,
            )
    return rates


def mas_mid_in_bank_unit(mas: MasRate, bank_unit: int) -> float | None:
    """Scale the published MAS figure onto the bank row's unit. Not a new rate."""
    if mas.unit <= 0 or bank_unit <= 0:
        return None
    return (mas.sgd_per_unit / mas.unit) * bank_unit


def earliest_consolidated_date(consolidated_dir: Path) -> date | None:
    dates: list[date] = []
    for path in consolidated_dir.glob("*.csv"):
        if path.stem in {"latest"} or path.stem.endswith("_long"):
            continue
        try:
            dates.append(date.fromisoformat(path.stem))
        except ValueError:
            continue
    return min(dates) if dates else None


def _parse_header_columns(cells: list[str]) -> list[tuple[str, int]]:
    columns: list[tuple[str, int]] = []
    for cell in cells[3:]:
        label = cell.strip()
        match = HEADER_RE.match(label)
        if not match:
            raise ValueError(f"Unrecognised MAS column header: {label!r}")
        unit = 1 if match.group(1).lower() == "unit" else 100
        columns.append((match.group(2).strip(), unit))
    if not columns:
        raise ValueError("MAS CSV has no currency columns")
    return columns


def _parse_rate(raw: str) -> float | None:
    text = raw.strip()
    if not text or text in {"na", "NA", "n.a.", "N.A.", "-", "--"}:
        return None
    return float(text.replace(",", ""))


def parse_mas_daily_csv(text: str) -> list[MasRate]:
    """Parse the MAS daily download CSV into published per-day rates."""
    reader = csv.reader(io.StringIO(text))
    columns: list[tuple[str, int]] | None = None
    year: int | None = None
    month: int | None = None
    rates: list[MasRate] = []
    unknown_names: set[str] = set()

    for row in reader:
        if not row or not any(cell.strip() for cell in row):
            continue
        first = row[0].strip()
        if first.startswith("*"):
            continue
        if first.startswith("End of Period"):
            columns = _parse_header_columns(row)
            continue
        if columns is None:
            continue
        if len(row) < 3:
            continue

        year_cell, month_cell, day_cell = row[0].strip(), row[1].strip(), row[2].strip()
        if not day_cell:
            continue
        if year_cell:
            year = int(year_cell)
        if month_cell:
            if month_cell not in MONTH_NUMBER:
                raise ValueError(f"Unrecognised MAS month: {month_cell!r}")
            month = MONTH_NUMBER[month_cell]
        if year is None or month is None:
            raise ValueError("MAS CSV row is missing year/month context")

        day = date(year, month, int(day_cell))
        values = row[3:]
        for index, (mas_currency, unit) in enumerate(columns):
            if index >= len(values):
                break
            parsed = _parse_rate(values[index])
            if parsed is None:
                continue
            iso = MAS_CURRENCY_ISO.get(mas_currency)
            if iso is None:
                unknown_names.add(mas_currency)
            rates.append(
                MasRate(
                    date=day,
                    mas_currency=mas_currency,
                    base_currency=iso,
                    unit=unit,
                    sgd_per_unit=parsed,
                )
            )

    if unknown_names:
        logger.warning(
            "MAS currencies without a known ISO code (stored with empty base_currency): %s",
            ", ".join(sorted(unknown_names)),
        )
    return rates


def _form_payload(html: str, start: date, end: date) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    payload: dict[str, str] = {}
    for hidden in soup.select('input[type="hidden"][name]'):
        payload[hidden["name"]] = hidden.get("value") or ""

    def set_select(element_id: str, value: str) -> None:
        select = soup.find(id=element_id)
        if select is None or not select.get("name"):
            raise ValueError(f"MAS form is missing {element_id}")
        payload[select["name"]] = value

    set_select("ContentPlaceHolder1_StartYearDropDownList", str(start.year))
    set_select("ContentPlaceHolder1_EndYearDropDownList", str(end.year))
    set_select("ContentPlaceHolder1_StartMonthDropDownList", str(start.month))
    set_select("ContentPlaceHolder1_EndMonthDropDownList", str(end.month))
    set_select("ContentPlaceHolder1_FrequencyDropDownList", "D")

    checkboxes = soup.select(
        'input[type="checkbox"][name^="ctl00$ContentPlaceHolder1$EndOfPeriod"]'
    )
    if not checkboxes:
        raise ValueError("MAS form has no currency checkboxes")
    for box in checkboxes:
        payload[box["name"]] = "on"

    download = soup.find(id="ContentPlaceHolder1_DownloadButton")
    if download is None or not download.get("name"):
        raise ValueError("MAS form is missing the Download button")
    payload[download["name"]] = download.get("value") or "Download"
    return payload


def download_mas_daily_csv(start: date, end: date) -> str:
    """Download the MAS daily CSV for the inclusive calendar-month range."""
    if end < start:
        raise ValueError("end date is before start date")

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    page = session.get(MAS_PAGE_URL, timeout=30)
    page.raise_for_status()

    payload = _form_payload(page.text, start, end)
    response = session.post(
        MAS_PAGE_URL,
        data=payload,
        headers={"Referer": MAS_PAGE_URL},
        timeout=60,
    )
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if "csv" not in content_type.lower() and "Exchange Rates" not in response.text[:200]:
        raise RuntimeError(
            f"MAS download did not return CSV (content-type={content_type!r})"
        )
    response.encoding = response.encoding or "utf-8"
    return response.text


def _write_day_csv(
    path: Path,
    day: date,
    day_rates: Iterable[MasRate],
    scraped_at: str,
) -> None:
    rows = []
    for rate in sorted(day_rates, key=lambda item: item.mas_currency):
        rows.append(
            {
                "date": day.isoformat(),
                "source": MAS_SOURCE,
                "source_url": MAS_PAGE_URL,
                "frequency": "daily",
                "mas_currency": rate.mas_currency,
                "base_currency": rate.base_currency or "",
                "quote_currency": QUOTE_CURRENCY,
                "unit": rate.unit,
                "sgd_per_unit": rate.sgd_per_unit,
                "scraped_at": scraped_at,
            }
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def _write_market_index(market_dir: Path) -> list[str]:
    dates = sorted(
        path.stem
        for path in market_dir.glob("*.csv")
        if path.stem != "latest" and not path.stem.endswith("_long")
    )
    index = {
        "source": MAS_SOURCE,
        "source_url": MAS_PAGE_URL,
        "frequency": "daily",
        "latest": "latest.csv",
        "dates": dates,
    }
    (market_dir / "index.json").write_text(
        json.dumps(index, indent=2),
        encoding="utf-8",
    )
    return dates


def sync_mas_daily_rates(
    market_dir: Path,
    *,
    start: date,
    end: date,
    skip_weekends: bool = True,
) -> list[date]:
    """Fetch MAS daily rates and write one CSV per published business day."""
    logger.info(
        "Fetching MAS daily rates %s to %s from %s",
        start.isoformat(),
        end.isoformat(),
        MAS_PAGE_URL,
    )
    csv_text = download_mas_daily_csv(start, end)
    scraped_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    by_day: dict[date, list[MasRate]] = {}
    for rate in parse_mas_daily_csv(csv_text):
        if rate.date < start or rate.date > end:
            continue
        if skip_weekends and is_weekend(rate.date):
            continue
        by_day.setdefault(rate.date, []).append(rate)

    written: list[date] = []
    for day, day_rates in sorted(by_day.items()):
        _write_day_csv(market_dir / f"{day.isoformat()}.csv", day, day_rates, scraped_at)
        written.append(day)
        logger.info("MAS %s: %d currencies", day.isoformat(), len(day_rates))

    dates = _write_market_index(market_dir)
    if dates:
        latest_src = market_dir / f"{dates[-1]}.csv"
        latest_dest = market_dir / "latest.csv"
        latest_dest.write_text(latest_src.read_text(encoding="utf-8"), encoding="utf-8")

    missing_weekdays = []
    cursor = start
    published = set(written)
    while cursor <= end:
        if not (skip_weekends and is_weekend(cursor)) and cursor not in published:
            missing_weekdays.append(cursor.isoformat())
        cursor += timedelta(days=1)
    if missing_weekdays:
        logger.info(
            "No MAS daily row for %d weekday(s) in range (holidays or not yet published): %s",
            len(missing_weekdays),
            ", ".join(missing_weekdays),
        )

    return written
