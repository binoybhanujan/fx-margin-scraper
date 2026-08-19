# FX Margin Dashboard

Browser-native comparison dashboard (HTML, CSS, ES modules). No Vite, npm, or other build step.

## Features

- Side-by-side bank comparison table (margin % of mid; lower is better)
- Filters: currency, transaction band, margin type (buy/sell FCY)
- Trend chart from historical `data/consolidated/{date}.csv` files
- Highlights best bank per row

## Local development

From the **repository root**, ensure scraped data exists:

```bash
python scripts/scrape.py
python scripts/serve_dashboard.py
```

Open http://127.0.0.1:5173

The Python server serves `frontend/` at `/` and `data/` at `/repo-data/`.

## Production data URL

Consolidated CSVs on `main` are the source of truth. For a dashboard that cannot use `/repo-data`, set `window.FX_DATA_BASE_URL` in `frontend/config.js`:

```javascript
window.FX_DATA_BASE_URL =
  "https://raw.githubusercontent.com/binoybhanujan/fx-margin-scraper/main/data/consolidated";
```

Then host the `frontend/` folder as static files (any HTTP server or GitHub Pages). The browser loads ES modules directly; there is no `dist/` build.

## Data files used

| File | Purpose |
|------|---------|
| `latest.csv` | Fallback snapshot when `index.json` has no dates |
| `index.json` | List of dated CSVs for the date filter and trends |
| `{date}.csv` | Historical snapshots |
