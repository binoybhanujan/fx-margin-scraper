"""Bank-specific FX rate scrapers."""

from fx_scraper.banks.base import BankScraper
from fx_scraper.banks.dbs import DbsScraper
from fx_scraper.banks.ocbc import OcbcScraper

# Register scrapers here as new banks are added.
SCRAPERS: list[BankScraper] = [
    DbsScraper(),
    OcbcScraper(),
]
