# FX Margin Dashboard

React dashboard to compare FX rates across banks (DBS, OCBC).

## Features

- Side-by-side bank comparison table (margin % of mid; lower is better)
- Filters: currency, transaction band, margin type (buy/sell FCY)
- Trend chart from historical `data/consolidated/{date}.csv` files
- Highlights best bank per row

## Local development

From the **repository root**, ensure scraped data exists:

```bash
python scripts/scrape.py
```

Then in `frontend/`:

```bash
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server serves CSV/JSON from `../data` at `/repo-data/`.

## Production data URL

Consolidated CSVs on `main` are the source of truth. For a deployed dashboard, set:

```bash
# frontend/.env.production
VITE_DATA_BASE_URL=https://raw.githubusercontent.com/binoybhanujan/fx-margin-scraper/main/data/consolidated
```

## Build

```bash
npm run build
npm run preview
```

Deploy `dist/` to Vercel, Netlify, or GitHub Pages.

## Data files used

| File | Purpose |
|------|---------|
| `latest.csv` | Current comparison table |
| `index.json` | List of dated CSVs for trends |
| `{date}.csv` | Historical snapshots |
