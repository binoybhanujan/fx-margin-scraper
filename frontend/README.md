# HSBC FX Margin Intelligence

React + TypeScript dashboard (Vite, Tailwind CSS, Recharts). HSBC-centric view of board **margin % of MAS midday** versus DBS, OCBC, and UOB. Lower % is cheaper for the customer. Nothing here is a pricing or trading recommendation.

Colours match the previous static page: HSBC red `#db0011`, grey paper `#e6e7e8`, ink `#1d1d1b`, Helvetica Neue.

## Page layout

Titled tiles, top to bottom:

1. **Executive summary** — date, buy/sell, KPIs, and top-3 highlights (headroom, pressure, market and HSBC extremes)
2. **Competitor margin trends** — HSBC vs DBS, OCBC, and UOB over time
3. **HSBC vs the market** — peer median and HSBC rank
4. **Headroom by currency** — snapshot bars for the selected date
5. **Bank comparison** — currency and band apply only to this table

## Metric definitions

All figures come from standardized CSV rows (`sell_margin_pct` / `buy_margin_pct`), which are board vs the same-day MAS midday print. Missing quotes (including days or currencies with no MAS rate) stay blank.

| Metric | Definition |
|--------|------------|
| HSBC rank | 1 = lowest margin among banks that quote that pair and band |
| Gap vs cheapest | HSBC − lowest peer margin (percentage points) |
| Headroom vs peers | Median of other quoting banks − HSBC. Positive means HSBC is cheaper than the typical peer |

Insights and trend views use the **insight band**: the table’s selected band, or **SGD 50 – 200** when the table band is All. Insights always include every currency HSBC quotes. The comparison table is the only view filtered by currency.

## Local development

From the **repository root**:

```bash
python scripts/scrape.py
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Vite serves CSV/JSON from `../data` at `/repo-data/`.

## Production build

```bash
cd frontend
npm run build
cd ..
python scripts/serve_dashboard.py
```

(`serve_dashboard.py` serves `frontend/dist` on port 4173.)

For a host without `/repo-data`, set `VITE_DATA_BASE_URL` (see `.env.example`) before `npm run build`.

## Data files used

| File | Purpose |
|------|---------|
| `latest.csv` | Fallback snapshot when `index.json` has no dates |
| `index.json` | List of dated CSVs for the date filter and trends |
| `{date}.csv` | Historical snapshots |
