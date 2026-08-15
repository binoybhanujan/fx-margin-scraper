"""Scrape FX reference rates and compute margin requirements."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from collections.abc import Iterable
from dataclasses import dataclass

import requests

ECB_DAILY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
DEFAULT_LEVERAGE_TIERS = (10, 20, 50, 100)
REQUEST_TIMEOUT_SECONDS = 30


@dataclass(frozen=True)
class FxRate:
    """A currency pair quoted against EUR from the ECB feed."""

    base: str
    quote: str
    rate: float


@dataclass(frozen=True)
class MarginRequirement:
    """Margin percentage required for a notional position at a leverage tier."""

    pair: str
    leverage: int
    margin_percent: float


class ScraperError(RuntimeError):
    """Raised when scraping or parsing fails."""


def fetch_ecb_rates(session: requests.Session | None = None) -> list[FxRate]:
    """Download and parse the ECB daily euro reference XML feed."""
    http = session or requests.Session()
    response = http.get(ECB_DAILY_URL, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()

    try:
        root = ET.fromstring(response.content)
    except ET.ParseError as exc:
        raise ScraperError("Failed to parse ECB XML feed") from exc

    namespace = {"gesmes": "http://www.gesmes.org/xml/2002-08-01", "ecb": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}
    cube = root.find(".//ecb:Cube/ecb:Cube[@time]", namespace)
    if cube is None:
        raise ScraperError("ECB feed did not contain a dated rate cube")

    rates: list[FxRate] = [FxRate(base="EUR", quote="EUR", rate=1.0)]
    for child in cube:
        currency = child.attrib.get("currency")
        rate_value = child.attrib.get("rate")
        if not currency or not rate_value:
            continue
        rates.append(FxRate(base="EUR", quote=currency, rate=float(rate_value)))

    if len(rates) <= 1:
        raise ScraperError("ECB feed did not return any currency rates")

    return rates


def compute_margin_requirements(
    rates: Iterable[FxRate],
    leverage_tiers: Iterable[int] = DEFAULT_LEVERAGE_TIERS,
) -> list[MarginRequirement]:
    """Compute margin percentages for each pair at standard leverage tiers."""
    requirements: list[MarginRequirement] = []
    for rate in rates:
        if rate.base == rate.quote:
            continue
        pair = f"{rate.base}/{rate.quote}"
        for leverage in leverage_tiers:
            if leverage <= 0:
                raise ValueError("Leverage must be positive")
            requirements.append(
                MarginRequirement(
                    pair=pair,
                    leverage=leverage,
                    margin_percent=round(100.0 / leverage, 4),
                )
            )
    return requirements


def scrape_fx_margins(
    session: requests.Session | None = None,
    leverage_tiers: Iterable[int] = DEFAULT_LEVERAGE_TIERS,
) -> tuple[list[FxRate], list[MarginRequirement]]:
    """Fetch ECB rates and derive margin requirements for each pair."""
    rates = fetch_ecb_rates(session=session)
    margins = compute_margin_requirements(rates, leverage_tiers=leverage_tiers)
    return rates, margins
