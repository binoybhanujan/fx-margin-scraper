/** Sort key from standardized band label (lowest SGD in the band). */
export function transactionBandSortKey(label) {
  const trimmed = label.trim();
  if (trimmed.includes("<")) {
    return 0;
  }
  const match = trimmed.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseFloat(match[1].replace(/,/g, ""));
}

export function getDataBaseUrl() {
  if (typeof window !== "undefined" && window.FX_DATA_BASE_URL) {
    return String(window.FX_DATA_BASE_URL).replace(/\/$/, "");
  }
  return "/repo-data/consolidated";
}

export function normalizeRate(rate, unit) {
  if (rate == null || unit <= 0) return null;
  return rate / unit;
}

export function getRateValue(row, rateType) {
  switch (rateType) {
    case "tt_od_sell":
      return (
        row.sell_margin_pct ??
        marginPctOfMid(row.tt_od_sell, row.mid_rate, true)
      );
    case "tt_buy":
      return (
        row.buy_margin_pct ??
        marginPctOfMid(row.tt_buy, row.mid_rate, false)
      );
    default:
      return null;
  }
}

function marginPctOfMid(rate, mid, customerBuysFcy) {
  if (rate == null || mid == null || mid === 0) return null;
  return customerBuysFcy
    ? ((rate - mid) / mid) * 100
    : ((mid - rate) / mid) * 100;
}

/** Band used for cross-bank comparison (standardized tiers only in the dashboard). */
export function getTransactionBand(row) {
  return row.std_transaction_value ?? row.transaction_value;
}

export function isStandardizedRow(row) {
  return row.record_type === "standardized";
}

/** Lower margin % of mid is better for the customer on both buy and sell. */
export function isLowerBetter(_rateType) {
  return true;
}

export function rateTypeLabel(rateType) {
  switch (rateType) {
    case "tt_od_sell":
      return "Buy FCY margin % of mid (bank sell)";
    case "tt_buy":
      return "Sell FCY margin % of mid (bank buy)";
    default:
      return rateType;
  }
}

export function formatRate(value, digits = 3) {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

export function sortTransactionBands(values) {
  return [...values].sort(
    (a, b) =>
      transactionBandSortKey(a) - transactionBandSortKey(b) ||
      a.localeCompare(b),
  );
}
