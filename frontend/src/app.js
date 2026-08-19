import {
  buildComparisonRows,
  filterStandardizedRows,
  uniqueBaseCurrencies,
  uniqueBanks,
  uniqueTransactionValues,
} from "./lib/compare.js";
import { fetchCsv, fetchIndex, loadHistoricalRates } from "./lib/loadRates.js";
import { getRateValue, getTransactionBand, rateTypeLabel } from "./lib/normalize.js";
import {
  bindFilters,
  renderChart,
  renderFilters,
  renderMeta,
  renderStatus,
  renderTable,
} from "./render.js";

const state = {
  snapshotRows: [],
  historyDates: [],
  selectedDate: "",
  loading: true,
  error: null,
  baseCurrency: "all",
  transactionValue: "all",
  rateType: "tt_od_sell",
  trendCurrency: "USD",
  trendPoints: [],
};

let cancelledIndex = false;
let cancelledSnapshot = false;

function derived() {
  const banks = uniqueBanks(state.snapshotRows);
  const currencies = uniqueBaseCurrencies(state.snapshotRows, state.rateType);
  const transactionValues = uniqueTransactionValues(state.snapshotRows);
  const comparisonRows = buildComparisonRows(
    state.snapshotRows,
    state.rateType,
    state.baseCurrency,
    state.transactionValue,
  );
  const lastUpdated = {};
  for (const row of state.snapshotRows) {
    if (!lastUpdated[row.bank] || row.last_updated > lastUpdated[row.bank]) {
      lastUpdated[row.bank] = row.last_updated;
    }
  }
  return { banks, currencies, transactionValues, comparisonRows, lastUpdated };
}

function paint() {
  const root = document;
  const d = derived();
  if (state.baseCurrency !== "all" && !d.currencies.includes(state.baseCurrency)) {
    state.baseCurrency = "all";
  }
  if (d.currencies.length > 0 && !d.currencies.includes(state.trendCurrency)) {
    state.trendCurrency = d.currencies.includes("USD") ? "USD" : d.currencies[0];
  }
  renderStatus(root, {
    loading: state.loading,
    error: state.error,
    hasRows: state.snapshotRows.length > 0,
    hasDates: state.historyDates.length > 0,
  });
  renderFilters(root, {
    dates: state.historyDates,
    currencies: d.currencies,
    transactionValues: d.transactionValues,
    selectedDate: state.selectedDate,
    baseCurrency: state.baseCurrency,
    transactionValue: state.transactionValue,
    rateType: state.rateType,
    trendCurrency: state.trendCurrency,
  });
  renderMeta(root, { banks: d.banks, lastUpdated: d.lastUpdated });
  renderTable(root, {
    rows: d.comparisonRows,
    banks: d.banks,
    loading: state.loading,
  });
  renderChart(root, {
    data: state.trendPoints,
    banks: d.banks,
    currencyPair: `${state.trendCurrency}/SGD`,
    rateLabel: rateTypeLabel(state.rateType),
  });
}

async function loadIndex() {
  cancelledIndex = false;
  state.loading = true;
  state.error = null;
  paint();
  try {
    const index = await fetchIndex();
    const dates = [...index.dates].sort((a, b) => b.localeCompare(a));
    if (cancelledIndex) return;
    state.historyDates = dates;
    if (dates.length > 0) {
      state.selectedDate = dates[0];
      paint();
      await loadSnapshot();
      return;
    }
    const latest = filterStandardizedRows(await fetchCsv(index.latest));
    if (cancelledIndex) return;
    state.snapshotRows = latest;
    const currencies = uniqueBaseCurrencies(latest);
    if (currencies.includes("USD")) {
      state.trendCurrency = "USD";
    } else if (currencies.length > 0) {
      state.trendCurrency = currencies[0];
    }
  } catch (err) {
    if (!cancelledIndex) {
      state.error = err instanceof Error ? err.message : "Failed to load data";
    }
  } finally {
    if (!cancelledIndex) {
      state.loading = false;
      paint();
    }
  }
}

async function loadSnapshot() {
  if (!state.selectedDate) return;
  cancelledSnapshot = false;
  state.loading = true;
  state.error = null;
  paint();
  try {
    const rows = filterStandardizedRows(await fetchCsv(`${state.selectedDate}.csv`));
    if (cancelledSnapshot) return;
    state.snapshotRows = rows;
    const currencies = uniqueBaseCurrencies(rows);
    if (currencies.includes(state.trendCurrency)) {
      /* keep */
    } else if (currencies.includes("USD")) {
      state.trendCurrency = "USD";
    } else if (currencies[0]) {
      state.trendCurrency = currencies[0];
    }
  } catch (err) {
    if (!cancelledSnapshot) {
      state.error = err instanceof Error ? err.message : "Failed to load data";
    }
  } finally {
    if (!cancelledSnapshot) {
      state.loading = false;
      paint();
    }
  }
}

async function loadTrend() {
  if (state.historyDates.length === 0) {
    state.trendPoints = [];
    paint();
    return;
  }
  const token = {};
  loadTrend.token = token;
  const historical = await loadHistoricalRates(state.historyDates);
  if (loadTrend.token !== token) return;
  const points = [];
  for (const [date, rows] of historical) {
    const seen = new Set();
    for (const row of filterStandardizedRows(rows)) {
      if (row.base_currency !== state.trendCurrency) continue;
      const band = getTransactionBand(row);
      if (state.transactionValue !== "all" && band !== state.transactionValue) {
        continue;
      }
      const dedupeKey = `${date}|${row.bank}`;
      if (state.transactionValue === "all" && seen.has(dedupeKey)) continue;
      const marginPct = getRateValue(row, state.rateType);
      if (marginPct == null) continue;
      seen.add(dedupeKey);
      points.push({ date, bank: row.bank, rate: marginPct });
    }
  }
  state.trendPoints = points;
  paint();
}

function main() {
  bindFilters(document, {
    onDateChange(value) {
      cancelledSnapshot = true;
      state.selectedDate = value;
      loadSnapshot().then(loadTrend);
    },
    onBaseCurrencyChange(value) {
      state.baseCurrency = value;
      paint();
    },
    onTransactionValueChange(value) {
      state.transactionValue = value;
      paint();
      loadTrend();
    },
    onRateTypeChange(value) {
      state.rateType = value;
      paint();
      loadTrend();
    },
    onTrendCurrencyChange(value) {
      state.trendCurrency = value;
      paint();
      loadTrend();
    },
  });
  loadIndex().then(loadTrend);
}

main();
