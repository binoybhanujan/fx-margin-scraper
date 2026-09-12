const BANK_COLORS = {
  hsbc: "#db0011",
  dbs: "#5b7c99",
  ocbc: "#8a8d8f",
  uob: "#2e2e2e",
};

function bankColor(bank) {
  return BANK_COLORS[bank] ?? "#8a8d8f";
}

function drawOrder(banks) {
  const peers = banks.filter((b) => b !== "hsbc");
  const hsbc = banks.filter((b) => b === "hsbc");
  return [...peers, ...hsbc];
}

export function renderTrendChart(container, { data, banks, currencyPair, rateLabel }) {
  container.replaceChildren();
  if (data.length === 0) {
    const p = document.createElement("p");
    p.className = "muted center chart-empty";
    p.textContent =
      "No historical data yet. Run the scraper on multiple days to see trends.";
    container.append(p);
    return;
  }

  const byDate = {};
  for (const point of data) {
    if (!byDate[point.date]) byDate[point.date] = { date: point.date };
    byDate[point.date][point.bank] = point.rate;
  }
  const series = Object.values(byDate).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  const caption = document.createElement("p");
  caption.className = "muted chart-caption";
  caption.textContent = `${currencyPair} — ${rateLabel}`;
  container.append(caption);

  const width = 720;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = [];
  for (const row of series) {
    for (const bank of banks) {
      const v = row[bank];
      if (typeof v === "number") values.push(v);
    }
  }
  if (values.length === 0) {
    const p = document.createElement("p");
    p.className = "muted center chart-empty";
    p.textContent = "No trend points for the selected filters.";
    container.append(p);
    return;
  }

  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const span = maxY - minY || 1;
  const y0 = minY - span * 0.08;
  const y1 = maxY + span * 0.08;

  const xAt = (i) =>
    pad.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const yAt = (v) => pad.top + ((y1 - v) / (y1 - y0)) * innerH;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${currencyPair} ${rateLabel} trend`);

  const gridCount = 4;
  for (let g = 0; g <= gridCount; g += 1) {
    const y = pad.top + (innerH * g) / gridCount;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(width - pad.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "chart-grid");
    svg.append(line);

    const val = y1 - ((y1 - y0) * g) / gridCount;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(pad.left - 8));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("class", "chart-axis");
    label.setAttribute("text-anchor", "end");
    label.textContent = `${val.toFixed(2)}%`;
    svg.append(label);
  }

  const xTickEvery = Math.max(1, Math.ceil(series.length / 6));
  series.forEach((row, i) => {
    if (i % xTickEvery !== 0 && i !== series.length - 1) return;
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", String(xAt(i)));
    text.setAttribute("y", String(height - 12));
    text.setAttribute("class", "chart-axis");
    text.setAttribute("text-anchor", "middle");
    text.textContent = row.date;
    svg.append(text);
  });

  for (const bank of drawOrder(banks)) {
    const pts = [];
    series.forEach((row, i) => {
      const v = row[bank];
      if (typeof v === "number") pts.push({ x: xAt(i), y: yAt(v) });
    });
    if (pts.length === 0) continue;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "),
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", bankColor(bank));
    path.setAttribute("stroke-width", bank === "hsbc" ? "2.5" : "2");
    svg.append(path);
    for (const p of pts) {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", String(p.x));
      dot.setAttribute("cy", String(p.y));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", bankColor(bank));
      svg.append(dot);
    }
  }

  const wrap = document.createElement("div");
  wrap.className = "chart-svg-wrap";
  wrap.append(svg);
  container.append(wrap);

  const legend = document.createElement("div");
  legend.className = "chart-legend";
  for (const bank of banks) {
    const item = document.createElement("span");
    item.className = "chart-legend-item";
    const swatch = document.createElement("i");
    swatch.style.background = bankColor(bank);
    item.append(swatch, document.createTextNode(bank.toUpperCase()));
    legend.append(item);
  }
  container.append(legend);
}

function emptyChart(container, text) {
  const p = document.createElement("p");
  p.className = "muted center chart-empty";
  p.textContent = text;
  container.replaceChildren(p);
}

function appendCaption(container, text) {
  const caption = document.createElement("p");
  caption.className = "muted chart-caption";
  caption.textContent = text;
  container.append(caption);
}

function appendLegend(container, items) {
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  for (const item of items) {
    const span = document.createElement("span");
    span.className = "chart-legend-item";
    const swatch = document.createElement("i");
    swatch.style.background = item.color;
    span.append(swatch, document.createTextNode(item.label));
    legend.append(span);
  }
  container.append(legend);
}

function drawDatedLineChart(container, { series, lines, yFormat, invertY, ariaLabel }) {
  const width = 720;
  const height = 260;
  const pad = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = [];
  for (const row of series) {
    for (const line of lines) {
      const v = row[line.key];
      if (typeof v === "number") values.push(v);
    }
  }
  if (values.length === 0) {
    emptyChart(container, "No trend points for the selected filters.");
    return;
  }

  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const span = maxY - minY || 1;
  const y0 = invertY ? maxY + span * 0.08 : minY - span * 0.08;
  const y1 = invertY ? minY - span * 0.08 : maxY + span * 0.08;

  const xAt = (i) =>
    pad.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const yAt = (v) => pad.top + ((y1 - v) / (y1 - y0)) * innerH;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", ariaLabel);

  const gridCount = 4;
  for (let g = 0; g <= gridCount; g += 1) {
    const y = pad.top + (innerH * g) / gridCount;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(width - pad.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "chart-grid");
    svg.append(line);

    const val = y1 - ((y1 - y0) * g) / gridCount;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(pad.left - 8));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("class", "chart-axis");
    label.setAttribute("text-anchor", "end");
    label.textContent = yFormat(val);
    svg.append(label);
  }

  const xTickEvery = Math.max(1, Math.ceil(series.length / 6));
  series.forEach((row, i) => {
    if (i % xTickEvery !== 0 && i !== series.length - 1) return;
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", String(xAt(i)));
    text.setAttribute("y", String(height - 12));
    text.setAttribute("class", "chart-axis");
    text.setAttribute("text-anchor", "middle");
    text.textContent =
      typeof row.date === "string" && row.date.length >= 10
        ? row.date.slice(5)
        : row.date;
    svg.append(text);
  });

  for (const spec of lines) {
    const pts = [];
    series.forEach((row, i) => {
      const v = row[spec.key];
      if (typeof v === "number") pts.push({ x: xAt(i), y: yAt(v) });
    });
    if (pts.length === 0) continue;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" "),
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", spec.color);
    path.setAttribute("stroke-width", spec.width ?? "2");
    if (spec.dash) path.setAttribute("stroke-dasharray", spec.dash);
    svg.append(path);
    for (const p of pts) {
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", String(p.x));
      dot.setAttribute("cy", String(p.y));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", spec.color);
      svg.append(dot);
    }
  }

  const wrap = document.createElement("div");
  wrap.className = "chart-svg-wrap";
  wrap.append(svg);
  container.append(wrap);
  appendLegend(
    container,
    lines.map((line) => ({ color: line.color, label: line.label })),
  );
}

export function renderPeerMedianChart(container, { series, caption }) {
  container.replaceChildren();
  if (!series || series.length === 0) {
    emptyChart(container, "No historical HSBC vs peer median yet.");
    return;
  }
  appendCaption(container, caption);
  drawDatedLineChart(container, {
    series,
    lines: [
      { key: "peerMedian", label: "Peer median", color: "#8a8d8f", dash: "4 3" },
      { key: "hsbc", label: "HSBC", color: "#db0011", width: "2.5" },
    ],
    yFormat: (v) => `${v.toFixed(2)}%`,
    invertY: false,
    ariaLabel: caption,
  });
}

export function renderRankChart(container, { series, caption }) {
  container.replaceChildren();
  if (!series || series.length === 0) {
    emptyChart(container, "No historical HSBC rank yet.");
    return;
  }
  appendCaption(container, caption);
  drawDatedLineChart(container, {
    series,
    lines: [{ key: "rank", label: "HSBC rank (1 = cheapest)", color: "#db0011", width: "2.5" }],
    yFormat: (v) => v.toFixed(1),
    invertY: true,
    ariaLabel: caption,
  });
}

export function renderHeadroomBars(container, { rows, caption }) {
  container.replaceChildren();
  if (!rows || rows.length === 0) {
    emptyChart(container, "No HSBC headroom on this date and insight band.");
    return;
  }
  appendCaption(container, caption);

  const width = 720;
  const rowH = 22;
  const pad = { top: 8, right: 24, bottom: 24, left: 72 };
  const height = pad.top + pad.bottom + rows.length * rowH;
  const innerW = width - pad.left - pad.right;
  const values = rows.map((r) => r.headroom);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 0.01);
  const x0 = pad.left + innerW / 2;
  const xAt = (v) => x0 + (v / maxAbs) * (innerW / 2);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "trend-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", caption);

  const zero = document.createElementNS(svgNS, "line");
  zero.setAttribute("x1", String(x0));
  zero.setAttribute("x2", String(x0));
  zero.setAttribute("y1", String(pad.top));
  zero.setAttribute("y2", String(height - pad.bottom));
  zero.setAttribute("class", "chart-zeroline");
  svg.append(zero);

  rows.forEach((row, i) => {
    const y = pad.top + i * rowH + 4;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(pad.left - 8));
    label.setAttribute("y", String(y + 11));
    label.setAttribute("class", "chart-axis");
    label.setAttribute("text-anchor", "end");
    label.textContent = row.base_currency;
    svg.append(label);

    const x1 = xAt(row.headroom);
    const bar = document.createElementNS(svgNS, "rect");
    const left = Math.min(x0, x1);
    bar.setAttribute("x", String(left));
    bar.setAttribute("y", String(y));
    bar.setAttribute("width", String(Math.abs(x1 - x0)));
    bar.setAttribute("height", "14");
    bar.setAttribute("class", row.headroom >= 0 ? "bar-widen" : "bar-pressure");
    svg.append(bar);
  });

  const wrap = document.createElement("div");
  wrap.className = "chart-svg-wrap chart-svg-wrap-bars";
  wrap.style.height = `${Math.min(height, 640)}px`;
  wrap.append(svg);
  container.append(wrap);
  appendLegend(container, [
    { color: "#8a8d8f", label: "Headroom (widen)" },
    { color: "#db0011", label: "Negative (pressure)" },
  ]);
}
