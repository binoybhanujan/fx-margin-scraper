const BANK_COLORS = {
  dbs: "#3b82f6",
  ocbc: "#f59e0b",
  uob: "#10b981",
  hsbc: "#db0011",
};

function bankColor(bank) {
  return BANK_COLORS[bank] ?? "#a78bfa";
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

  for (const bank of banks) {
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
    path.setAttribute("stroke-width", "2");
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
