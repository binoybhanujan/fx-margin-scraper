# Frontend (planned)

Web UI to display FX rate trends across banks.

## Planned features

- Compare buy/sell rates by bank and currency
- Time-series charts from `data/consolidated/` and `data/raw/` history
- Filter by currency, amount tier, and rate type (TT/OD sell, TT buy, OD buy)

## Data source

The frontend will read from:

- `data/consolidated/latest.csv` — current snapshot (all banks)
- `data/consolidated/latest_long.csv` — long format for plotting
- `data/raw/{bank}/{date}.csv` — historical daily files

## Suggested stack (not yet implemented)

- React or Next.js for the UI
- Chart library (e.g. Recharts, Chart.js) for trends
- Optional: small API layer to serve CSV/JSON from `data/`

Implementation will be added in a future phase.
