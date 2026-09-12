# FX Margin Scraper

Collect foreign exchange rates from multiple Singapore banks, consolidate them into a single dataset, and compare **margin % of MAS midday** in a web dashboard.

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
│   ├── consolidated/        # Merged bank CSVs (committed; GitHub source of truth)
│   └── market/              # MAS daily SGD rates (committed)
├── frontend/                # Comparison dashboard (static HTML/JS, no build)
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
| `data/consolidated/latest.csv` | All banks — native + standardized bands. `mid_rate` and margin % are vs **same-day MAS** midday when published (`bank_mid_rate` keeps the bank mid). |
| `data/market/{date}.csv` | MAS daily SGD rates (all published currencies) for that business day |

## Adding a new bank

1. Create `src/fx_scraper/banks/{bank}.py` implementing `BankScraper`.
2. Register it in `src/fx_scraper/banks/__init__.py` (`SCRAPERS` list).
3. Run `python scripts/scrape.py` — output is auto-consolidated.

## Dashboard (frontend)

Compare bank rates side-by-side and view HSBC’s position versus peers. The UI is static HTML, CSS, and ES modules — no Vite, npm, or bundler.

```bash
python scripts/scrape.py              # ensure data/ is populated
python scripts/serve_dashboard.py     # http://127.0.0.1:5173
```

See [frontend/README.md](frontend/README.md).

## Daily scheduling

GitHub Actions runs **Monday–Friday** at **6:00 PM IST** (no weekend run). Each run:

1. Downloads **MAS** daily SGD exchange rates for every currency MAS publishes, from the first bank-rate date through today, and writes `data/market/{date}.csv`.
2. Scrapes the banks and writes `data/consolidated/` with margins vs that day’s MAS mid (`latest.csv`, `{date}.csv`, `index.json`). Existing dated files are re-exported the same way. Weekends, holidays, and currencies MAS does not list keep board buy/sell but leave `mid_rate` / margins blank — they are not filled from bank mid or from a previous day.

MAS figures are the midday Singapore interbank average (Refinitiv), published on Singapore business days only. Weekends and holidays are **not** filled from a previous day. The JSON datastore API is currently on a maintenance page; the fetcher uses the official [Exchange Rates](https://eservices.mas.gov.sg/Statistics/msb/ExchangeRates.aspx) CSV download.

```bash
python scripts/scrape.py --mas-only   # MAS files only
python scripts/scrape.py --skip-mas   # banks only
```

Workflow: `.github/workflows/daily-scrape.yml` (also runnable from **Actions → Daily FX scrape → Run workflow**).

## Banks supported

| Bank | Status | Native tiers | Standardized bands (dashboard) |
|------|--------|--------------|--------------------------------|
| DBS  | ✅ Implemented | SGD &lt; 50, SGD 50 – 200 | 4 bands (see `std_bands.py`) |
| OCBC | ✅ Implemented | SGD 0 – 39,999.99, SGD 40,000 – 100,000 | Same 4 standardized bands |
| UOB  | ✅ Implemented | Single indicative board (no SGD amount tiers) | Same 4 bands (fallback to board) |
| HSBC | ✅ Implemented | Single indicative board (HTML; no SGD amount tiers) | Same 4 bands (fallback to board) |
