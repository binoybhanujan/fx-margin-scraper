# FX Margin Scraper

Scrape European Central Bank (ECB) daily euro reference rates and compute margin requirements for common leverage tiers.

## Requirements

- Python 3.11+

## Setup

```bash
./scripts/cloud-agent-install.sh
source .venv/bin/activate
```

## Usage

```bash
fx-margin-scraper
fx-margin-scraper --json
fx-margin-scraper --leverage 10 25 50
```

## Development

```bash
source .venv/bin/activate
pytest
ruff check src tests
```

## Data source

Rates are fetched from the ECB daily XML feed:

`https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml`

Margin percentages are derived as `100 / leverage` for each currency pair.
