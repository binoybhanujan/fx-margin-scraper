export type RateType = "tt_od_sell" | "tt_buy";
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
  mid_rate: number | null;
  sell_margin_pct: number | null;
  buy_margin_pct: number | null;
}

export interface ConsolidatedIndex {
  latest: string;
  dates: string[];
}

export interface BankCell {
  rawRate: number | null;
  normalizedRate: number | null;
  last_updated: string;
}

export interface ComparisonRow {
  currency_pair: string;
  base_currency: string;
  transaction_value: string;
  banks: Record<string, BankCell>;
  bestBank: string | null;
}

export interface TrendPoint {
  date: string;
  bank: string;
  rate: number;
}

export interface HsbcRowInsight {
  currency_pair: string;
  base_currency: string;
  transaction_value: string;
  hsbcMargin: number;
  rank: number;
  quotedCount: number;
  isCheapest: boolean;
  isMostExpensive: boolean;
  cheapestBank: string;
  cheapestPeerBank: string | null;
  cheapestPeerMargin: number | null;
  peerMedian: number | null;
  gapVsCheapest: number | null;
  headroom: number | null;
}

export interface MarketRowInsight {
  currency_pair: string;
  base_currency: string;
  transaction_value: string;
  marketMedian: number;
  cheapestBank: string;
  widestBank: string;
}

export interface HsbcInsights {
  band: string;
  kpis: {
    quoted: number;
    cheapestCount: number;
    mostExpensiveCount: number;
    medianRank: number | null;
    medianGapVsCheapest: number | null;
  };
  widen: HsbcRowInsight[];
  pressure: HsbcRowInsight[];
  marketCheapest: MarketRowInsight[];
  marketDearest: MarketRowInsight[];
  hsbcCheapest: HsbcRowInsight[];
  hsbcDearest: HsbcRowInsight[];
  headroomBars: HsbcRowInsight[];
}

export interface PeerSeriesPoint {
  date: string;
  hsbc: number | null;
  peerMedian: number | null;
  rank: number | null;
}
