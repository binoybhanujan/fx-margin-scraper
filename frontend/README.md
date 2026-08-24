# HSBC FX Margin Intelligence

Browser-native dashboard (HTML, CSS, ES modules). No Vite, npm, or other build step.

HSBC-centric view of board **margin % of mid** versus DBS, OCBC, and UOB. Lower % is cheaper for the customer. Nothing here is a pricing or trading recommendation.

## Page layout

Titled tiles, top to bottom:

1. **Executive summary** — date, buy/sell, KPIs, and top-3 highlights (headroom, pressure, market and HSBC extremes)
2. **Competitor margin trends** — HSBC vs DBS, OCBC, and UOB over time
3. **HSBC vs the market** — peer median and HSBC rank
4. **Headroom by currency** — snapshot bars for the selected date
5. **Bank comparison** — currency and band apply only to this table

## Features

- KPI strip: how many currencies HSBC quotes, how often HSBC is cheapest / most expensive, median rank, median gap vs the cheapest peer
- Opportunity to widen: HSBC cheaper than the **median of other quoting banks** (headroom = peer median − HSBC)
- Competitive pressure: HSBC widest or above peer median (gap = HSBC − cheapest peer)
- Least / most expensive **in the market** (median of all quoting banks) and **on HSBC’s book** (HSBC’s own margin)
- Time series: HSBC vs peer median and HSBC rank (1 = cheapest for the customer)
- Headroom bars for every HSBC-quoted currency on the selected date
- Side-by-side comparison table (HSBC column first)

## Metric definitions

All figures come from standardized CSV rows (`sell_margin_pct` / `buy_margin_pct`). Missing quotes stay blank.

| Metric | Definition |
|--------|------------|
| HSBC rank | 1 = lowest margin among banks that quote that pair and band |
| Gap vs cheapest | HSBC − lowest peer margin (percentage points) |
| Headroom vs peers | Median of other quoting banks − HSBC. Positive means HSBC is cheaper than the typical peer |

Insights and trend views use the **insight band**: the table’s selected band, or **SGD 50 – 200** when the table band is All. Insights always include every currency HSBC quotes. The comparison table is the only view filtered by currency.

## Disclaimers

- Rates are indicative board rates from each bank’s public page.
- Mid is the bank-published mid when present; otherwise the average of buy and sell.
- HSBC has no SGD amount tiers; standardized large/small bands copy the same board.
- No volumes, so there is no book-weighted view.

## Local development

From the **repository root**:

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

Then host the `frontend/` folder as static files.

## Data files used

| File | Purpose |
|------|---------|
| `latest.csv` | Fallback snapshot when `index.json` has no dates |
| `index.json` | List of dated CSVs for the date filter and trends |
| `{date}.csv` | Historical snapshots |
