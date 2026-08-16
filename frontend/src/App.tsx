import { useEffect, useMemo, useState } from "react";
import { ComparisonTable } from "./components/ComparisonTable";
import { Filters } from "./components/Filters";
import { RateTrendChart } from "./components/RateTrendChart";
import {
  buildComparisonRows,
  filterStandardizedRows,
  uniqueBaseCurrencies,
  uniqueBanks,
  uniqueTransactionValues,
} from "./lib/compare";
import {
  fetchCsv,
  fetchIndex,
  loadHistoricalRates,
} from "./lib/loadRates";
import {
  getRateValue,
  getTransactionBand,
  normalizeRate,
  rateTypeLabel,
} from "./lib/normalize";
import type { FxRateRow, RateType, TrendPoint } from "./lib/types";

export default function App() {
  const [snapshotRows, setSnapshotRows] = useState<FxRateRow[]>([]);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [baseCurrency, setBaseCurrency] = useState("all");
  const [transactionValue, setTransactionValue] = useState("all");
  const [rateType, setRateType] = useState<RateType>("tt_od_sell");
  const [trendCurrency, setTrendCurrency] = useState("USD");

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      setLoading(true);
      setError(null);
      try {
        const index = await fetchIndex();
        const dates = [...index.dates].sort((a, b) => b.localeCompare(a));
        if (cancelled) return;
        setHistoryDates(dates);
        if (dates.length > 0) {
          setSelectedDate(dates[0]);
          return;
        }
        const latest = filterStandardizedRows(await fetchCsv(index.latest));
        if (cancelled) return;
        setSnapshotRows(latest);
        const currencies = uniqueBaseCurrencies(latest);
        if (currencies.includes("USD")) {
          setTrendCurrency("USD");
        } else if (currencies.length > 0) {
          setTrendCurrency(currencies[0]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    async function loadSnapshot() {
      setLoading(true);
      setError(null);
      try {
        const rows = filterStandardizedRows(await fetchCsv(`${selectedDate}.csv`));
        if (cancelled) return;
        setSnapshotRows(rows);
        const currencies = uniqueBaseCurrencies(rows);
        setTrendCurrency((current) =>
          currencies.includes(current)
            ? current
            : currencies.includes("USD")
              ? "USD"
              : currencies[0] ?? current,
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const banks = useMemo(() => uniqueBanks(snapshotRows), [snapshotRows]);
  const currencies = useMemo(
    () => uniqueBaseCurrencies(snapshotRows),
    [snapshotRows],
  );
  const transactionValues = useMemo(
    () => uniqueTransactionValues(snapshotRows),
    [snapshotRows],
  );

  const comparisonRows = useMemo(
    () =>
      buildComparisonRows(
        snapshotRows,
        rateType,
        baseCurrency,
        transactionValue,
      ),
    [snapshotRows, rateType, baseCurrency, transactionValue],
  );

  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);

  useEffect(() => {
    if (historyDates.length === 0) {
      setTrendPoints([]);
      return;
    }
    let cancelled = false;
    async function loadTrend() {
      const historical = await loadHistoricalRates(historyDates);
      if (cancelled) return;
      const points: TrendPoint[] = [];
      for (const [date, rows] of historical) {
        const seen = new Set<string>();
        for (const row of filterStandardizedRows(rows)) {
          if (row.base_currency !== trendCurrency) continue;
          const band = getTransactionBand(row);
          if (transactionValue !== "all" && band !== transactionValue) {
            continue;
          }
          const dedupeKey = `${date}|${row.bank}`;
          if (transactionValue === "all" && seen.has(dedupeKey)) continue;
          const raw = getRateValue(row, rateType);
          const normalized = normalizeRate(raw, row.unit);
          if (normalized == null) continue;
          seen.add(dedupeKey);
          points.push({ date, bank: row.bank, rate: normalized });
        }
      }
      setTrendPoints(points);
    }
    loadTrend();
    return () => {
      cancelled = true;
    };
  }, [historyDates, trendCurrency, rateType, transactionValue]);

  const lastUpdated = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of snapshotRows) {
      if (!map[row.bank] || row.last_updated > map[row.bank]) {
        map[row.bank] = row.last_updated;
      }
    }
    return map;
  }, [snapshotRows]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            FX Rate Comparison
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Compare DBS and OCBC board rates — SGD per 1 unit of foreign
            currency (banks may quote per 1 or per 100 FCY; rates are normalized).
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {loading && snapshotRows.length === 0 && !error && (
          <p className="text-slate-400">Loading rates…</p>
        )}
        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-red-300 text-sm">
            {error}
            <p className="mt-2 text-slate-400">
              Run <code className="text-slate-200">python scripts/scrape.py</code>
              from the project root, then refresh. In dev, data is served from
              <code className="text-slate-200"> /repo-data</code>.
            </p>
          </div>
        )}

        {!error && (snapshotRows.length > 0 || historyDates.length > 0) && (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Filters</h2>
              <Filters
                dates={historyDates}
                currencies={currencies}
                transactionValues={transactionValues}
                selectedDate={selectedDate}
                baseCurrency={baseCurrency}
                transactionValue={transactionValue}
                rateType={rateType}
                onDateChange={setSelectedDate}
                onBaseCurrencyChange={setBaseCurrency}
                onTransactionValueChange={setTransactionValue}
                onRateTypeChange={setRateType}
              />
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {banks.map((bank) => (
                  <span key={bank}>
                    <span className="capitalize font-medium text-slate-400">
                      {bank}
                    </span>
                    : last updated {lastUpdated[bank] ?? "—"}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium">Bank comparison</h2>
              {loading ? (
                <p className="text-slate-400 text-sm">Loading rates for {selectedDate}…</p>
              ) : (
                <ComparisonTable rows={comparisonRows} banks={banks} />
              )}
            </section>

            <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex flex-wrap items-end gap-4">
                <h2 className="text-lg font-medium">Rate trends</h2>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-400">Trend currency</span>
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                    value={trendCurrency}
                    onChange={(e) => setTrendCurrency(e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <RateTrendChart
                data={trendPoints}
                banks={banks}
                currencyPair={`${trendCurrency}/SGD`}
                rateLabel={rateTypeLabel(rateType)}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
