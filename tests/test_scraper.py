"""Tests for the FX margin scraper."""

from __future__ import annotations

import pytest
import requests

from fx_margin_scraper.scraper import (
    ECB_DAILY_URL,
    FxRate,
    MarginRequirement,
    ScraperError,
    compute_margin_requirements,
    fetch_ecb_rates,
    scrape_fx_margins,
)

SAMPLE_ECB_XML = """<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01"
                 xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <Cube>
    <Cube time="2026-08-15">
      <Cube currency="USD" rate="1.1716"/>
      <Cube currency="GBP" rate="0.86290"/>
      <Cube currency="JPY" rate="172.12"/>
    </Cube>
  </Cube>
</gesmes:Envelope>
"""


class DummyResponse:
    def __init__(self, content: bytes, status_code: int = 200) -> None:
        self.content = content
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"status {self.status_code}")


class DummySession:
    def __init__(self, content: bytes) -> None:
        self._content = content
        self.last_url: str | None = None

    def get(self, url: str, timeout: int = 30) -> DummyResponse:
        self.last_url = url
        return DummyResponse(self._content)


def test_fetch_ecb_rates_parses_sample_xml() -> None:
    session = DummySession(SAMPLE_ECB_XML.encode())
    rates = fetch_ecb_rates(session=session)

    assert session.last_url == ECB_DAILY_URL
    assert rates[0] == FxRate(base="EUR", quote="EUR", rate=1.0)
    assert any(rate.quote == "USD" and rate.rate == 1.1716 for rate in rates)


def test_fetch_ecb_rates_rejects_invalid_xml() -> None:
    session = DummySession(b"not-xml")
    with pytest.raises(ScraperError):
        fetch_ecb_rates(session=session)


def test_compute_margin_requirements() -> None:
    rates = [FxRate(base="EUR", quote="USD", rate=1.17)]
    margins = compute_margin_requirements(rates, leverage_tiers=[10, 50])

    assert margins == [
        MarginRequirement(pair="EUR/USD", leverage=10, margin_percent=10.0),
        MarginRequirement(pair="EUR/USD", leverage=50, margin_percent=2.0),
    ]


def test_scrape_fx_margins_end_to_end_with_stub() -> None:
    session = DummySession(SAMPLE_ECB_XML.encode())
    rates, margins = scrape_fx_margins(session=session, leverage_tiers=[20])

    assert len(rates) == 4
    assert all(margin.leverage == 20 for margin in margins)
    assert all(margin.margin_percent == 5.0 for margin in margins)
