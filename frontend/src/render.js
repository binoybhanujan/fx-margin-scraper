import { formatRate } from "./lib/normalize.js";
import {
  formatBank,
  formatMargin,
  formatPp,
  HSBC_BANK,
} from "./lib/insights.js";
import {
  renderHeadroomBars,
  renderPeerMedianChart,
  renderRankChart,
  renderTrendChart,
} from "./chart.js";

function selectOptions(select, values, selected, extraFirst) {
  select.replaceChildren();
  if (extraFirst) {
    const opt = document.createElement("option");
    opt.value = extraFirst.value;
    opt.textContent = extraFirst.label;
    select.append(opt);
  }
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.append(opt);
  }
  select.value = selected;
}

function emptyMessage(text) {
  const p = document.createElement("p");
  p.className = "muted compact-empty";
  p.textContent = text;
  return p;
}

function insightTable(headers, rows) {
  if (rows.length === 0) {
    return emptyMessage("No currencies match this view for the insight band.");
  }
  const table = document.createElement("table");
  table.className = "compact-table";
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    hr.append(th);
  }
  thead.append(hr);
  const tbody = document.createElement("tbody");
  for (const cells of rows) {
    const tr = document.createElement("tr");
    for (const cell of cells) {
      const td = document.createElement("td");
      td.className = cell.className ?? "";
      td.textContent = cell.text;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(thead, tbody);
  return table;
}

export function bindFilters(root, handlers) {
  root.querySelector("#filter-date").addEventListener("change", (e) => {
    handlers.onDateChange(e.target.value);
  });
  root.querySelector("#filter-currency").addEventListener("change", (e) => {
    handlers.onBaseCurrencyChange(e.target.value);
  });
  root.querySelector("#filter-band").addEventListener("change", (e) => {
    handlers.onTransactionValueChange(e.target.value);
  });
  root.querySelector("#filter-rate").addEventListener("change", (e) => {
    handlers.onRateTypeChange(e.target.value);
  });
  root.querySelector("#trend-currency").addEventListener("change", (e) => {
    handlers.onTrendCurrencyChange(e.target.value);
  });
}

export function renderFilters(root, state) {
  selectOptions(
    root.querySelector("#filter-date"),
    state.dates,
    state.selectedDate,
  );
  selectOptions(
    root.querySelector("#filter-currency"),
    state.currencies,
    state.baseCurrency,
    { value: "all", label: "All currencies" },
  );
  selectOptions(
    root.querySelector("#filter-band"),
    state.transactionValues,
    state.transactionValue,
    { value: "all", label: "All bands" },
  );
  root.querySelector("#filter-rate").value = state.rateType;
  selectOptions(
    root.querySelector("#trend-currency"),
    state.currencies,
    state.trendCurrency,
  );
}

export function renderMeta(root, { banks, lastUpdated }) {
  const el = root.querySelector("#bank-updated");
  el.replaceChildren();
  for (const bank of banks) {
    const span = document.createElement("span");
    const name = document.createElement("span");
    name.className = "bank-name";
    name.textContent = bank;
    span.append(name, document.createTextNode(`: last updated ${lastUpdated[bank] ?? "—"}`));
    el.append(span);
  }
}

export function renderStatus(root, { loading, error, hasRows, hasDates }) {
  const loadingEl = root.querySelector("#status-loading");
  const errorEl = root.querySelector("#status-error");
  const contentEl = root.querySelector("#dashboard-content");
  const tableLoading = root.querySelector("#table-loading");

  loadingEl.hidden = !(loading && !hasRows && !error);
  errorEl.hidden = !error;
  if (error) {
    errorEl.querySelector(".error-message").textContent = error;
  }
  contentEl.hidden = !(!error && (hasRows || hasDates));
  tableLoading.hidden = !loading;
}

export function renderKpis(root, insights) {
  const bandEl = root.querySelector("#insight-band-label");
  const grid = root.querySelector("#kpi-grid");
  if (!insights) {
    bandEl.textContent = "";
    const blurb = root.querySelector("#exec-blurb");
    if (blurb) blurb.textContent = "";
    grid.replaceChildren();
    return;
  }
  bandEl.textContent = `Insight band: ${insights.band}`;
  const blurb = root.querySelector("#exec-blurb");
  if (blurb) {
    const rank =
      insights.kpis.medianRank == null
        ? "—"
        : insights.kpis.medianRank.toFixed(1);
    blurb.textContent =
      `HSBC quotes ${insights.kpis.quoted} currencies. Cheapest on ` +
      `${insights.kpis.cheapestCount}, most expensive on ` +
      `${insights.kpis.mostExpensiveCount}. Median rank ${rank}. ` +
      `Median gap vs cheapest peer ${formatPp(insights.kpis.medianGapVsCheapest)}.`;
  }
  const cards = [
    { label: "HSBC quotes", value: String(insights.kpis.quoted) },
    {
      label: "HSBC cheapest",
      value: String(insights.kpis.cheapestCount),
    },
    {
      label: "HSBC most expensive",
      value: String(insights.kpis.mostExpensiveCount),
    },
    {
      label: "Median HSBC rank",
      value:
        insights.kpis.medianRank == null
          ? "—"
          : insights.kpis.medianRank.toFixed(1),
    },
    {
      label: "Median gap vs cheapest",
      value: formatPp(insights.kpis.medianGapVsCheapest),
    },
  ];
  grid.replaceChildren();
  for (const card of cards) {
    const div = document.createElement("div");
    div.className = "kpi-card";
    const label = document.createElement("p");
    label.className = "kpi-label";
    label.textContent = card.label;
    const value = document.createElement("p");
    value.className = "kpi-value";
    value.textContent = card.value;
    div.append(label, value);
    grid.append(div);
  }
}

export function renderInsightLists(root, insights) {
  const widen = root.querySelector("#widen-table");
  const pressure = root.querySelector("#pressure-table");
  const marketCheap = root.querySelector("#market-cheap-table");
  const marketDear = root.querySelector("#market-dear-table");
  const hsbcCheap = root.querySelector("#hsbc-cheap-table");
  const hsbcDear = root.querySelector("#hsbc-dear-table");

  if (!insights) {
    for (const el of [widen, pressure, marketCheap, marketDear, hsbcCheap, hsbcDear]) {
      el.replaceChildren();
    }
    return;
  }

  widen.replaceChildren(
    insightTable(
      ["Pair", "HSBC", "Peer median", "Headroom", "Cheapest peer"],
      insights.widen.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.hsbcMargin), className: "tabular" },
        { text: formatMargin(r.peerMedian), className: "tabular" },
        { text: formatPp(r.headroom), className: "tabular" },
        {
          text: `${formatBank(r.cheapestPeerBank)} ${formatMargin(r.cheapestPeerMargin)}`,
        },
      ]),
    ),
  );

  pressure.replaceChildren(
    insightTable(
      ["Pair", "HSBC", "Gap vs cheapest", "Cheapest bank"],
      insights.pressure.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.hsbcMargin), className: "tabular" },
        { text: formatPp(r.gapVsCheapest), className: "tabular" },
        { text: formatBank(r.cheapestBank) },
      ]),
    ),
  );

  marketCheap.replaceChildren(
    insightTable(
      ["Pair", "Market median", "Cheapest bank"],
      insights.marketCheapest.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.marketMedian), className: "tabular" },
        { text: formatBank(r.cheapestBank) },
      ]),
    ),
  );

  marketDear.replaceChildren(
    insightTable(
      ["Pair", "Market median", "Widest bank"],
      insights.marketDearest.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.marketMedian), className: "tabular" },
        { text: formatBank(r.widestBank) },
      ]),
    ),
  );

  hsbcCheap.replaceChildren(
    insightTable(
      ["Pair", "HSBC margin", "Rank"],
      insights.hsbcCheapest.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.hsbcMargin), className: "tabular" },
        { text: String(r.rank) },
      ]),
    ),
  );

  hsbcDear.replaceChildren(
    insightTable(
      ["Pair", "HSBC margin", "Rank"],
      insights.hsbcDearest.slice(0, 3).map((r) => [
        { text: r.currency_pair, className: "cell-strong" },
        { text: formatMargin(r.hsbcMargin), className: "tabular" },
        { text: String(r.rank) },
      ]),
    ),
  );
}

export function renderTable(root, { rows, banks, loading }) {
  const empty = root.querySelector("#table-empty");
  const wrap = root.querySelector("#table-wrap");
  const table = root.querySelector("#comparison-table");
  if (loading) {
    empty.hidden = true;
    wrap.hidden = true;
    return;
  }
  if (rows.length === 0) {
    empty.hidden = false;
    wrap.hidden = true;
    return;
  }
  empty.hidden = true;
  wrap.hidden = false;

  const thead = table.querySelector("thead");
  const headerRow = document.createElement("tr");
  const pairTh = document.createElement("th");
  pairTh.textContent = "Pair";
  const bandTh = document.createElement("th");
  bandTh.textContent = "Transaction band";
  headerRow.append(pairTh, bandTh);
  for (const bank of banks) {
    const th = document.createElement("th");
    th.textContent = bank;
    if (bank === HSBC_BANK) th.className = "hsbc-col-header";
    const hint = document.createElement("span");
    hint.className = "th-hint";
    hint.textContent = "Margin % of mid";
    th.append(hint);
    headerRow.append(th);
  }
  const bestTh = document.createElement("th");
  bestTh.textContent = "Best for customer";
  headerRow.append(bestTh);
  thead.replaceChildren(headerRow);

  const tbody = table.querySelector("tbody");
  tbody.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement("tr");
    const pairTd = document.createElement("td");
    pairTd.className = "cell-strong";
    pairTd.textContent = row.currency_pair;
    const bandTd = document.createElement("td");
    bandTd.className = "muted";
    bandTd.textContent = row.transaction_value;
    tr.append(pairTd, bandTd);
    for (const bank of banks) {
      const cell = row.banks[bank];
      const isBest = row.bestBank === bank && cell?.normalizedRate != null;
      const td = document.createElement("td");
      const classes = ["tabular"];
      if (isBest) classes.push("best-cell");
      if (bank === HSBC_BANK) classes.push("hsbc-col");
      td.className = classes.join(" ");
      td.textContent = formatRate(cell?.normalizedRate ?? null);
      tr.append(td);
    }
    const bestTd = document.createElement("td");
    bestTd.className = "best-cell";
    bestTd.textContent = row.bestBank ?? "—";
    tr.append(bestTd);
    tbody.append(tr);
  }
}

export function renderChart(root, props) {
  renderTrendChart(root.querySelector("#trend-chart"), props);
}

export function renderTrendExtras(root, { peerSeries, insights, trendPair, rateLabel, insightBand }) {
  renderPeerMedianChart(root.querySelector("#peer-median-chart"), {
    series: peerSeries,
    caption: `${trendPair} — HSBC vs peer median (${rateLabel})`,
  });
  renderRankChart(root.querySelector("#rank-chart"), {
    series: peerSeries,
    caption: `${trendPair} — HSBC rank over time`,
  });
  renderHeadroomBars(root.querySelector("#headroom-chart"), {
    rows: insights?.headroomBars ?? [],
    caption: `Headroom by currency — ${insightBand ?? ""}`,
  });
}
