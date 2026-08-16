# FX Margin Scraper

Collect foreign exchange rates from multiple Singapore banks, consolidate them into a single dataset, and compare rates in a web dashboard.

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
│   ├── raw/{bank}/          # Per-bank snapshots (gitignored)
│   └── consolidated/        # Merged CSVs (committed; GitHub source of truth)
├── frontend/                # React comparison dashboard
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
| `data/consolidated/latest.csv` | All banks — native + standardized bands (committed to GitHub) |

## Adding a new bank

1. Create `src/fx_scraper/banks/{bank}.py` implementing `BankScraper`.
2. Register it in `src/fx_scraper/banks/__init__.py` (`SCRAPERS` list).
3. Run `python scripts/scrape.py` — output is auto-consolidated.

## Dashboard (frontend)

Compare bank rates side-by-side and view trends:

```bash
python scripts/scrape.py          # ensure data/ is populated
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — see [frontend/README.md](frontend/README.md).

## Daily scheduling

GitHub Actions runs the scraper every day at **6:00 PM IST** and commits `data/consolidated/` (`latest.csv`, `{date}.csv`, `index.json`). That folder is the shared source of truth for the dashboard.

Workflow: `.github/workflows/daily-scrape.yml` (also runnable from **Actions → Daily FX scrape → Run workflow**).

## Banks supported

| Bank | Status | Native tiers | Standardized bands (dashboard) |
|------|--------|--------------|--------------------------------|
| DBS  | ✅ Implemented | SGD &lt; 50, SGD 50 – 200 | 4 bands (see `std_bands.py`) |
| OCBC | ✅ Implemented | SGD 0 – 39,999.99, SGD 40,000 – 100,000 | Same 4 standardized bands |
