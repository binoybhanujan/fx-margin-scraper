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
  return row[rateType];
}

/** Band used for cross-bank comparison (standardized tiers only in the dashboard). */
export function getTransactionBand(row: FxRateRow): string {
  return row.std_transaction_value ?? row.transaction_value;
}

export function isStandardizedRow(row: FxRateRow): boolean {
  return row.record_type === "standardized";
}

/** Lower normalized rate is better when buying FCY from the bank (tt_od_sell). */
export function isLowerBetter(
  rateType: "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate",
): boolean {
  return rateType === "tt_od_sell";
}

export function rateTypeLabel(
  rateType: "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate",
): string {
  switch (rateType) {
    case "tt_od_sell":
      return "Buy FCY (bank sell / TT/OD sell)";
    case "tt_buy":
      return "Sell FCY (TT buy)";
    case "od_buy":
      return "Sell FCY (OD buy)";
    case "mid_rate":
      return "Mid rate";
  }
}

export function formatRate(value: number | null, digits = 6): string {
  if (value == null) return "—";
  if (value >= 100) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(digits);
}

export function sortTransactionBands(values: string[]): string[] {
  return [...values].sort(
    (a, b) =>
      transactionBandSortKey(a) - transactionBandSortKey(b) ||
      a.localeCompare(b),
  );
}
