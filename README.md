# FX Margin Scraper

Collect foreign exchange rates from multiple Singapore banks, consolidate them into a single dataset, and (planned) visualize trends in a web frontend.

## Project structure

```
fx-margin-scraper/
├── src/fx_scraper/          # Core Python package
│   ├── models.py            # Shared data models
│   ├── exporter.py          # CSV export (per-bank + consolidated)
│   ├── runner.py            # Orchestrates all scrapers
│   ├── cli.py               # Installed CLI entry point
│   └── banks/               # Bank-specific scrapers
│       ├── base.py          # Scraper interface
│       ├── dbs.py           # DBS Singapore
│       └── __init__.py      # Scraper registry
├── scripts/
│   └── scrape.py            # Run scraper (no install required)
├── data/
│   ├── raw/{bank}/          # Per-bank daily snapshots (gitignored)
│   └── consolidated/        # Merged output (gitignored)
├── scheduler/               # Daily run setup (Task Scheduler / cron)
├── frontend/                # Planned trend visualization UI
├── pyproject.toml
└── requirements.txt
```

## Quick start

```bash
pip install -r requirements.txt
pip install -e .

# Run all scrapers
python scripts/scrape.py

# Or after install
fx-scrape
```

## Output

After a run:

| File | Description |
|------|-------------|
| `data/raw/dbs/2026-08-15.csv` | DBS rates for that day |
| `data/consolidated/latest.csv` | All banks, one row per bank+currency |
| `data/consolidated/latest_long.csv` | Long format for charts/analytics |

## Adding a new bank

1. Create `src/fx_scraper/banks/{bank}.py` implementing `BankScraper`.
2. Register it in `src/fx_scraper/banks/__init__.py` (`SCRAPERS` list).
3. Run `python scripts/scrape.py` — output is auto-consolidated.

## Daily scheduling

See [scheduler/README.md](scheduler/README.md) for Windows Task Scheduler and cron setup.

## Frontend (planned)

See [frontend/README.md](frontend/README.md).

## Banks supported

| Bank | Status |
|------|--------|
| DBS  | ✅ Implemented |
