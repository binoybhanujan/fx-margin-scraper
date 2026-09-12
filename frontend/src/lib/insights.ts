import type {
  ComparisonRow,
  FxRateRow,
  HsbcInsights,
  HsbcRowInsight,
  MarketRowInsight,
  PeerSeriesPoint,
  RateType,
} from "./types";
import { formatRate } from "./normalize";
import { buildComparisonRows } from "./compare";

export const HSBC_BANK = "hsbc";
export const DEFAULT_INSIGHT_BAND = "SGD 50 – 200";

function median(values: Array<number | null | undefined>) {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function quoted(row: ComparisonRow) {
  return Object.entries(row.banks)
    .filter(([, cell]) => cell?.normalizedRate != null)
    .map(([bank, cell]) => ({ bank, margin: cell.normalizedRate as number }));
}

function analyzeHsbcRow(row: ComparisonRow): HsbcRowInsight | null {
  const quotes = quoted(row);
  const hsbc = quotes.find((q) => q.bank === HSBC_BANK);
  if (!hsbc) return null;

  const peers = quotes.filter((q) => q.bank !== HSBC_BANK);
  const cheapest = quotes.reduce((a, b) => (a.margin < b.margin ? a : b));
  const widest = quotes.reduce((a, b) => (a.margin > b.margin ? a : b));
  const ranked = [...quotes].sort((a, b) => a.margin - b.margin);
  const rank = ranked.findIndex((q) => q.bank === HSBC_BANK) + 1;
  const peerMargins = peers.map((p) => p.margin);
  const cheapestPeer =
    peers.length === 0
      ? null
      : peers.reduce((a, b) => (a.margin < b.margin ? a : b));
  const peerMin = cheapestPeer ? cheapestPeer.margin : null;
  const peerMedian = median(peerMargins);

  return {
    currency_pair: row.currency_pair,
    base_currency: row.base_currency,
    transaction_value: row.transaction_value,
    hsbcMargin: hsbc.margin,
    rank,
    quotedCount: quotes.length,
    isCheapest: cheapest.bank === HSBC_BANK,
    isMostExpensive: widest.bank === HSBC_BANK,
    cheapestBank: cheapest.bank,
    cheapestPeerBank: cheapestPeer?.bank ?? null,
    cheapestPeerMargin: cheapestPeer?.margin ?? null,
    peerMedian,
    gapVsCheapest: peerMin != null ? hsbc.margin - peerMin : null,
    headroom: peerMedian != null ? peerMedian - hsbc.margin : null,
  };
}

function marketRow(row: ComparisonRow): MarketRowInsight | null {
  const quotes = quoted(row);
  if (quotes.length === 0) return null;
  const med = median(quotes.map((q) => q.margin));
  if (med == null) return null;
  return {
    currency_pair: row.currency_pair,
    base_currency: row.base_currency,
    transaction_value: row.transaction_value,
    marketMedian: med,
    cheapestBank: quotes.reduce((a, b) => (a.margin < b.margin ? a : b)).bank,
    widestBank: quotes.reduce((a, b) => (a.margin > b.margin ? a : b)).bank,
  };
}

export function banksHsbcFirst(banks: string[]) {
  const rest = banks.filter((b) => b !== HSBC_BANK).sort();
  return banks.includes(HSBC_BANK) ? [HSBC_BANK, ...rest] : [...banks].sort();
}

/** Band used for KPI / ranked lists. Avoid repeating HSBC's single board four times. */
export function resolveInsightBand(
  selectedBand: string,
  availableBands: string[],
) {
  if (selectedBand && selectedBand !== "all") return selectedBand;
  if (availableBands.includes(DEFAULT_INSIGHT_BAND)) {
    return DEFAULT_INSIGHT_BAND;
  }
  return availableBands[0] ?? "";
}

export function formatPp(value: number | null) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} pp`;
}

export function formatBank(bank: string | null) {
  if (!bank) return "—";
  return bank.toUpperCase();
}

export function formatMargin(value: number | null) {
  return formatRate(value);
}

export function buildHsbcInsights(
  comparisonRows: ComparisonRow[],
  insightBandLabel: string,
): HsbcInsights {
  const bandRows = comparisonRows.filter(
    (row) => row.transaction_value === insightBandLabel,
  );
  const hsbcRows = bandRows
    .map(analyzeHsbcRow)
    .filter((r): r is HsbcRowInsight => r != null);
  const ranks = hsbcRows.map((r) => r.rank);
  const gaps = hsbcRows
    .map((r) => r.gapVsCheapest)
    .filter((v): v is number => v != null);

  const widen = hsbcRows
    .filter((r) => r.headroom != null && r.headroom > 0)
    .sort((a, b) => (b.headroom ?? 0) - (a.headroom ?? 0));

  const pressure = hsbcRows
    .filter(
      (r) => r.isMostExpensive || (r.headroom != null && r.headroom < 0),
    )
    .sort((a, b) => (b.gapVsCheapest ?? 0) - (a.gapVsCheapest ?? 0));

  const market = bandRows
    .map(marketRow)
    .filter((r): r is MarketRowInsight => r != null && r.marketMedian != null)
    .sort((a, b) => a.marketMedian - b.marketMedian);

  const hsbcBook = [...hsbcRows].sort((a, b) => a.hsbcMargin - b.hsbcMargin);

  return {
    band: insightBandLabel,
    kpis: {
      quoted: hsbcRows.length,
      cheapestCount: hsbcRows.filter((r) => r.isCheapest).length,
      mostExpensiveCount: hsbcRows.filter((r) => r.isMostExpensive).length,
      medianRank: median(ranks),
      medianGapVsCheapest: median(gaps),
    },
    widen,
    pressure,
    marketCheapest: market.slice(0, 5),
    marketDearest: [...market].reverse().slice(0, 5),
    hsbcCheapest: hsbcBook.slice(0, 5),
    hsbcDearest: [...hsbcBook].reverse().slice(0, 5),
    headroomBars: hsbcRows
      .filter((r) => r.headroom != null)
      .sort((a, b) => (b.headroom ?? 0) - (a.headroom ?? 0)),
  };
}

/** One point per dated CSV: HSBC margin, peer median, and rank for a currency + band. */
export function buildHsbcTimeSeries(
  historical: Map<string, FxRateRow[]>,
  rateType: RateType,
  currency: string,
  band: string,
): PeerSeriesPoint[] {
  const dates = [...historical.keys()].sort((a, b) => a.localeCompare(b));
  const series: PeerSeriesPoint[] = [];
  for (const date of dates) {
    const rows = historical.get(date) ?? [];
    const comparison = buildComparisonRows(rows, rateType, currency, band);
    const match = comparison.find((row) => row.base_currency === currency);
    const point: PeerSeriesPoint = {
      date,
      hsbc: null,
      peerMedian: null,
      rank: null,
    };
    if (match) {
      const snap = analyzeHsbcRow(match);
      if (snap) {
        point.hsbc = snap.hsbcMargin;
        point.peerMedian = snap.peerMedian;
        point.rank = snap.rank;
      } else {
        const peers = quoted(match).filter((q) => q.bank !== HSBC_BANK);
        point.peerMedian = median(peers.map((p) => p.margin));
      }
    }
    series.push(point);
  }
  return series;
}
