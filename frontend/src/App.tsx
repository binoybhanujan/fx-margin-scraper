import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ComparisonTable,
} from "./components/ComparisonTable";
import {
  CompetitorTrendChart,
  HeadroomBars,
  PeerMedianChart,
  RankChart,
} from "./components/Charts";
import { CompactTable, Field, Select, Tile } from "./components/ui";
import {
  buildComparisonRows,
  filterStandardizedRows,
  uniqueBaseCurrencies,
  uniqueBanks,
  uniqueTransactionValues,
} from "./lib/compare";
import {
  banksHsbcFirst,
  buildHsbcInsights,
  buildHsbcTimeSeries,
  formatBank,
  formatMargin,
  formatPp,
  resolveInsightBand,
} from "./lib/insights";
import { fetchCsv, fetchIndex, loadHistoricalRates } from "./lib/loadRates";
import { getRateValue, getTransactionBand, rateTypeLabel } from "./lib/normalize";
import type { FxRateRow, PeerSeriesPoint, RateType, TrendPoint } from "./lib/types";

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
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [peerSeries, setPeerSeries] = useState<PeerSeriesPoint[]>([]);

  const banks = useMemo(
    () => banksHsbcFirst(uniqueBanks(snapshotRows)),
    [snapshotRows],
  );
  const currencies = useMemo(
    () => uniqueBaseCurrencies(snapshotRows, rateType),
    [snapshotRows, rateType],
  );
  const transactionValues = useMemo(
    () => uniqueTransactionValues(snapshotRows),
    [snapshotRows],
  );
  const insightBand = useMemo(
    () => resolveInsightBand(transactionValue, transactionValues),
    [transactionValue, transactionValues],
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
  const insightSourceRows = useMemo(
    () =>
      insightBand
        ? buildComparisonRows(snapshotRows, rateType, "all", insightBand)
        : [],
    [snapshotRows, rateType, insightBand],
  );
  const insights = useMemo(
    () =>
      insightBand ? buildHsbcInsights(insightSourceRows, insightBand) : null,
    [insightSourceRows, insightBand],
  );
  const lastUpdated = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of snapshotRows) {
      if (!map[row.bank] || row.last_updated > map[row.bank]) {
        map[row.bank] = row.last_updated;
      }
    }
    return map;
  }, [snapshotRows]);

  const loadSnapshot = useCallback(async (date: string) => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const rows = filterStandardizedRows(await fetchCsv(`${date}.csv`));
      setSnapshotRows(rows);
      const nextCurrencies = uniqueBaseCurrencies(rows);
      setTrendCurrency((prev) => {
        if (nextCurrencies.includes(prev)) return prev;
        if (nextCurrencies.includes("USD")) return "USD";
        return nextCurrencies[0] ?? prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        const nextCurrencies = uniqueBaseCurrencies(latest);
        if (nextCurrencies.includes("USD")) {
          setTrendCurrency("USD");
        } else if (nextCurrencies[0]) {
          setTrendCurrency(nextCurrencies[0]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedDate) {
      void loadSnapshot(selectedDate);
    }
  }, [selectedDate, loadSnapshot]);

  useEffect(() => {
    if (historyDates.length === 0) {
      setTrendPoints([]);
      setPeerSeries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const historical = await loadHistoricalRates(historyDates);
      if (cancelled) return;
      const bands =
        uniqueTransactionValues(snapshotRows).length > 0
          ? uniqueTransactionValues(snapshotRows)
          : uniqueTransactionValues(
              [...historical.values()].find((rows) => rows.length > 0) ?? [],
            );
      const band = resolveInsightBand(transactionValue, bands);
      const points: TrendPoint[] = [];
      for (const [date, rows] of historical) {
        const seen = new Set<string>();
        for (const row of filterStandardizedRows(rows)) {
          if (row.base_currency !== trendCurrency) continue;
          const rowBand = getTransactionBand(row);
          if (band && rowBand !== band) continue;
          const dedupeKey = `${date}|${row.bank}`;
          if (seen.has(dedupeKey)) continue;
          const marginPct = getRateValue(row, rateType);
          if (marginPct == null) continue;
          seen.add(dedupeKey);
          points.push({ date, bank: row.bank, rate: marginPct });
        }
      }
      setTrendPoints(points);
      setPeerSeries(
        band
          ? buildHsbcTimeSeries(historical, rateType, trendCurrency, band)
          : [],
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [historyDates, snapshotRows, transactionValue, rateType, trendCurrency]);

  useEffect(() => {
    if (baseCurrency !== "all" && !currencies.includes(baseCurrency)) {
      setBaseCurrency("all");
    }
  }, [baseCurrency, currencies]);

  const showContent = !error && (snapshotRows.length > 0 || historyDates.length > 0);
  const rankLabel =
    insights?.kpis.medianRank == null
      ? "—"
      : insights.kpis.medianRank.toFixed(1);

  return (
    <>
      <header className="bg-white text-[#333] border-t-[6px] border-hsbc-red shadow-header relative z-10">
        <div className="max-w-dashboard mx-auto w-full px-9 pt-7 pb-5">
          <h1 className="flex flex-wrap items-center gap-3 m-0 text-2xl font-bold leading-tight text-[#333]">
            <span className="text-hsbc-red font-bold tracking-wide">HSBC</span>
            <span className="inline-block w-px h-[1.15em] bg-[#333] shrink-0" aria-hidden />
            <span>FX Pricing Market Position</span>
          </h1>
          <p className="mt-2 mb-0 text-[0.95rem] font-normal text-[#666]">
            Executive template: Where is HSBC positioned and where are the
            largest pricing gaps?
          </p>
        </div>
      </header>

      <main className="max-w-dashboard mx-auto w-full px-9 pt-5 pb-10 flex flex-col gap-12">
        {loading && snapshotRows.length === 0 && !error && (
          <p className="text-muted">Loading rates…</p>
        )}
        {error && (
          <div className="border border-hsbc-red bg-[#fde8e8] text-[#6b0008] px-4 py-3 text-sm">
            <div>{error}</div>
            <p className="mt-2 mb-0 text-muted">
              Run <code className="bg-panel px-1 text-ink">python scripts/scrape.py</code>{" "}
              from the project root, then refresh. Locally, data is served from{" "}
              <code className="bg-panel px-1 text-ink">/repo-data</code>.
            </p>
          </div>
        )}

        {showContent && (
          <>
            <Tile
              title="Executive summary"
              aside={
                insights ? (
                  <p className="m-0 text-[#c8c9c7] text-sm">
                    Insight band: {insights.band}
                  </p>
                ) : null
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date">
                  <Select value={selectedDate} onChange={setSelectedDate}>
                    {historyDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Margin type">
                  <Select
                    value={rateType}
                    onChange={(v) => setRateType(v as RateType)}
                  >
                    <option value="tt_od_sell">
                      Buy FCY (sell margin % of mid)
                    </option>
                    <option value="tt_buy">
                      Sell FCY (buy margin % of mid)
                    </option>
                  </Select>
                </Field>
              </div>
              {insights && (
                <p className="m-0 text-[0.95rem] leading-snug">
                  HSBC quotes {insights.kpis.quoted} currencies. Cheapest on{" "}
                  {insights.kpis.cheapestCount}, most expensive on{" "}
                  {insights.kpis.mostExpensiveCount}. Median rank {rankLabel}.
                  Median gap vs cheapest peer{" "}
                  {formatPp(insights.kpis.medianGapVsCheapest)}.
                </p>
              )}
              <div className="grid gap-3 grid-cols-2 min-[900px]:grid-cols-5">
                {(
                  [
                    ["HSBC quotes", insights ? String(insights.kpis.quoted) : "—"],
                    [
                      "HSBC cheapest",
                      insights ? String(insights.kpis.cheapestCount) : "—",
                    ],
                    [
                      "HSBC most expensive",
                      insights ? String(insights.kpis.mostExpensiveCount) : "—",
                    ],
                    ["Median HSBC rank", rankLabel],
                    [
                      "Median gap vs cheapest",
                      insights
                        ? formatPp(insights.kpis.medianGapVsCheapest)
                        : "—",
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="border-t-[3px] border-hsbc-red bg-panel px-3.5 py-3.5"
                  >
                    <p className="m-0 text-[0.7rem] tracking-wide uppercase text-muted">
                      {label}
                    </p>
                    <p className="mt-1.5 mb-0 text-xl font-semibold tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 min-[900px]:grid-cols-2">
                <div>
                  <h3 className="m-0 text-base font-semibold">Largest headroom</h3>
                  <p className="mt-0 mb-2 text-muted text-sm">
                    Top 3 where HSBC is cheaper than the peer median.
                  </p>
                  <CompactTable
                    headers={[
                      "Pair",
                      "HSBC",
                      "Peer median",
                      "Headroom",
                      "Cheapest peer",
                    ]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.widen.slice(0, 3) ?? []).map((r) => [
                      r.currency_pair,
                      formatMargin(r.hsbcMargin),
                      formatMargin(r.peerMedian),
                      formatPp(r.headroom),
                      `${formatBank(r.cheapestPeerBank)} ${formatMargin(r.cheapestPeerMargin)}`,
                    ])}
                  />
                </div>
                <div>
                  <h3 className="m-0 text-base font-semibold">Tightest pressure</h3>
                  <p className="mt-0 mb-2 text-muted text-sm">
                    Top 3 where HSBC is widest or above the peer median.
                  </p>
                  <CompactTable
                    headers={["Pair", "HSBC", "Gap vs cheapest", "Cheapest bank"]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.pressure.slice(0, 3) ?? []).map((r) => [
                      r.currency_pair,
                      formatMargin(r.hsbcMargin),
                      formatPp(r.gapVsCheapest),
                      formatBank(r.cheapestBank),
                    ])}
                  />
                </div>
                <div>
                  <h3 className="m-0 text-base font-semibold">
                    Market cheapest / dearest
                  </h3>
                  <p className="mt-0 mb-2 text-muted text-sm">
                    Median of all quoting banks.
                  </p>
                  <p className="mt-2 mb-1 text-[0.7rem] font-bold tracking-widest uppercase text-muted">
                    Cheapest
                  </p>
                  <CompactTable
                    headers={["Pair", "Market median", "Cheapest bank"]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.marketCheapest.slice(0, 3) ?? []).map(
                      (r) => [
                        r.currency_pair,
                        formatMargin(r.marketMedian),
                        formatBank(r.cheapestBank),
                      ],
                    )}
                  />
                  <p className="mt-3 mb-1 text-[0.7rem] font-bold tracking-widest uppercase text-muted">
                    Most expensive
                  </p>
                  <CompactTable
                    headers={["Pair", "Market median", "Widest bank"]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.marketDearest.slice(0, 3) ?? []).map(
                      (r) => [
                        r.currency_pair,
                        formatMargin(r.marketMedian),
                        formatBank(r.widestBank),
                      ],
                    )}
                  />
                </div>
                <div>
                  <h3 className="m-0 text-base font-semibold">
                    HSBC book cheapest / dearest
                  </h3>
                  <p className="mt-0 mb-2 text-muted text-sm">HSBC’s own margin.</p>
                  <p className="mt-2 mb-1 text-[0.7rem] font-bold tracking-widest uppercase text-muted">
                    Cheapest
                  </p>
                  <CompactTable
                    headers={["Pair", "HSBC margin", "Rank"]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.hsbcCheapest.slice(0, 3) ?? []).map((r) => [
                      r.currency_pair,
                      formatMargin(r.hsbcMargin),
                      String(r.rank),
                    ])}
                  />
                  <p className="mt-3 mb-1 text-[0.7rem] font-bold tracking-widest uppercase text-muted">
                    Most expensive
                  </p>
                  <CompactTable
                    headers={["Pair", "HSBC margin", "Rank"]}
                    empty="No currencies match this view for the insight band."
                    rows={(insights?.hsbcDearest.slice(0, 3) ?? []).map((r) => [
                      r.currency_pair,
                      formatMargin(r.hsbcMargin),
                      String(r.rank),
                    ])}
                  />
                </div>
              </div>
              <p className="m-0 text-xs leading-snug text-muted">
                All currencies on the insight band (default SGD 50 – 200 when the
                table band is All). HSBC’s single indicative board is copied
                across standardized bands. Mid is same-day MAS midday when
                published. Missing quotes are not inferred. Not a pricing
                recommendation.
              </p>
            </Tile>

            <Tile title="Competitor margin trends">
              <div className="flex flex-wrap items-end gap-4">
                <p className="m-0 text-muted text-sm flex-1">
                  HSBC (red) vs DBS, OCBC, and UOB for the selected currency and
                  insight band.
                </p>
                <Field label="Trend currency">
                  <Select value={trendCurrency} onChange={setTrendCurrency}>
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <CompetitorTrendChart
                data={trendPoints}
                banks={banks}
                caption={`${trendCurrency}/SGD — ${rateTypeLabel(rateType)}`}
              />
            </Tile>

            <Tile title="HSBC vs the market">
              <p className="m-0 text-muted text-sm">
                Same currency, insight band, and scrape dates as competitor
                trends. Days without an HSBC quote stay on the axis (rank is
                blank). Rank 1 is cheapest for the customer.
              </p>
              <div className="grid gap-5 min-[900px]:grid-cols-2">
                <div>
                  <h3 className="mt-5 mb-1 text-[0.95rem] font-semibold">
                    HSBC vs peer median
                  </h3>
                  <PeerMedianChart
                    series={peerSeries}
                    caption={`${trendCurrency}/SGD — HSBC vs peer median (${rateTypeLabel(rateType)})`}
                  />
                </div>
                <div>
                  <h3 className="mt-5 mb-1 text-[0.95rem] font-semibold">
                    HSBC rank over time
                  </h3>
                  <RankChart
                    series={peerSeries}
                    caption={`${trendCurrency}/SGD — HSBC rank over time`}
                  />
                </div>
              </div>
            </Tile>

            <Tile title="Headroom by currency">
              <p className="m-0 text-muted text-sm">
                Peer median minus HSBC on the selected date. Grey = cheaper than
                typical peer (room to widen). Red = already wider than typical.
              </p>
              <HeadroomBars
                rows={insights?.headroomBars ?? []}
                caption={`Headroom by currency — ${insightBand ?? ""}`}
              />
            </Tile>

            <Tile title="Bank comparison">
              <p className="m-0 text-muted text-sm">
                Detail of every quoting bank. Currency and band apply only to
                this table.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency">
                  <Select value={baseCurrency} onChange={setBaseCurrency}>
                    <option value="all">All currencies</option>
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Standardized band">
                  <Select
                    value={transactionValue}
                    onChange={setTransactionValue}
                  >
                    <option value="all">All bands</option>
                    {transactionValues.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-2">
                {banks.map((bank) => (
                  <span key={bank}>
                    <span className="capitalize font-semibold text-ink">{bank}</span>
                    {`: last updated ${lastUpdated[bank] ?? "—"}`}
                  </span>
                ))}
              </div>
              <ComparisonTable
                rows={comparisonRows}
                banks={banks}
                loading={loading}
              />
            </Tile>
          </>
        )}
      </main>
    </>
  );
}
