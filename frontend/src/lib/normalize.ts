import type { FxRateRow } from "./types";

/** Sort key from standardized band label (lowest SGD in the band). */
export function transactionBandSortKey(label: string): number {
  const trimmed = label.trim();
  if (trimmed.includes("<")) {
    return 0;
  }
  const match = trimmed.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseFloat(match[1].replace(/,/g, ""));
}

export function getDataBaseUrl(): string {
  const env = import.meta.env.VITE_DATA_BASE_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  return "/repo-data/consolidated";
}

export function normalizeRate(rate: number | null, unit: number): number | null {
  if (rate == null || unit <= 0) return null;
  return rate / unit;
}

export function getRateValue(
  row: FxRateRow,
  rateType: "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate",
): number | null {
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
    case "od_buy":
      return (
        row.od_buy_margin_pct ??
        marginPctOfMid(row.od_buy, row.mid_rate, false)
      );
    case "mid_rate":
      return null;
  }
}

function marginPctOfMid(
  rate: number | null,
  mid: number | null,
  customerBuysFcy: boolean,
): number | null {
  if (rate == null || mid == null || mid === 0) return null;
  return customerBuysFcy ? ((rate - mid) / mid) * 100 : ((mid - rate) / mid) * 100;
}

/** Band used for cross-bank comparison (standardized tiers only in the dashboard). */
export function getTransactionBand(row: FxRateRow): string {
  return row.std_transaction_value ?? row.transaction_value;
}

export function isStandardizedRow(row: FxRateRow): boolean {
  return row.record_type === "standardized";
}

/** Lower margin % of mid is better for the customer on both buy and sell. */
export function isLowerBetter(
  _rateType: "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate",
): boolean {
  return true;
}

export function rateTypeLabel(
  rateType: "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate",
): string {
  switch (rateType) {
    case "tt_od_sell":
      return "Buy FCY margin % of mid (bank sell)";
    case "tt_buy":
      return "Sell FCY margin % of mid (TT buy)";
    case "od_buy":
      return "Sell FCY margin % of mid (OD buy)";
    case "mid_rate":
      return "Mid rate";
  }
}

export function formatRate(value: number | null, digits = 3): string {
  if (value == null) return "—";
  return `${value.toFixed(digits)}%`;
}

export function sortTransactionBands(values: string[]): string[] {
  return [...values].sort(
    (a, b) =>
      transactionBandSortKey(a) - transactionBandSortKey(b) ||
      a.localeCompare(b),
  );
}
