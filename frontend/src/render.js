import { formatRate } from "./lib/normalize.js";
import { renderTrendChart } from "./chart.js";

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
    const hint = document.createElement("span");
    hint.className = "th-hint";
    hint.textContent = "Margin % of mid";
    th.append(hint);
    headerRow.append(th);
  }
  const bestTh = document.createElement("th");
  bestTh.textContent = "Best";
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
      td.className = isBest ? "tabular best-cell" : "tabular";
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
