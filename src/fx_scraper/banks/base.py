"""Base class for bank FX rate scrapers."""

from __future__ import annotations

from abc import ABC, abstractmethod

from fx_scraper.models import FxRatesSnapshot


class BankScraper(ABC):
    """Interface every bank scraper must implement."""

    name: str

    @abstractmethod
    def fetch(self) -> FxRatesSnapshot:
        """Fetch current FX rates from the bank."""
