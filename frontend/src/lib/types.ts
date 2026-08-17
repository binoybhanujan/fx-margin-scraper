export type RateType = "tt_od_sell" | "tt_buy" | "od_buy" | "mid_rate";
export type RecordType = "native" | "standardized";

export interface FxRateRow {
  record_type: RecordType;
  bank: string;
  base_currency: string;
  quote_currency: string;
  currency_pair: string;
  unit: number;
  transaction_value: string;
  amount_tier: string;
  std_transaction_value: string | null;
  std_amount_tier: string | null;
  group: string;
  effective_date: string;
  last_updated: string;
  scraped_at: string;
  tt_od_sell: number | null;
  tt_buy: number | null;
  od_buy: number | null;
  mid_rate: number | null;
  sell_margin_pct: number | null;
  buy_margin_pct: number | null;
  od_buy_margin_pct: number | null;
}

export interface ConsolidatedIndex {
  latest: string;
  dates: string[];
}

export interface ComparisonRow {
  currency_pair: string;
  base_currency: string;
  transaction_value: string;
  banks: Record<
    string,
    {
      rawRate: number | null;
      normalizedRate: number | null;
      last_updated: string;
    }
  >;
  bestBank: string | null;
}

export interface TrendPoint {
  date: string;
  bank: string;
  rate: number;
}
