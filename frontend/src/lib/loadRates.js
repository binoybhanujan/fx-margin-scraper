import { parseCsv } from "./parseCsv.js";
import { getDataBaseUrl } from "./normalize.js";

function parseNumber(value) {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseRecordType(value) {
  return value === "standardized" ? "standardized" : "native";
}

function parseRow(raw) {
  const stdTransactionValue = raw.std_transaction_value?.trim();
  const stdAmountTier = raw.std_amount_tier?.trim();
  return {
    record_type: parseRecordType(raw.record_type),
    bank: raw.bank ?? "",
    base_currency: raw.base_currency ?? "",
    quote_currency: raw.quote_currency ?? "",
    currency_pair: raw.currency_pair ?? "",
    unit: Number(raw.unit) || 1,
    transaction_value: raw.transaction_value ?? "",
    amount_tier: raw.amount_tier ?? "",
    std_transaction_value: stdTransactionValue || null,
    std_amount_tier: stdAmountTier || null,
    group: raw.group ?? "",
    effective_date: raw.effective_date ?? "",
    last_updated: raw.last_updated ?? "",
    scraped_at: raw.scraped_at ?? "",
    tt_od_sell: parseNumber(raw.tt_od_sell),
    tt_buy: parseNumber(raw.tt_buy),
    mid_rate: parseNumber(raw.mid_rate),
    sell_margin_pct: parseNumber(raw.sell_margin_pct),
    buy_margin_pct: parseNumber(raw.buy_margin_pct),
  };
}

export async function fetchCsv(filename) {
  const base = getDataBaseUrl();
  const url = `${base}/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  const text = await response.text();
  return parseCsv(text).map(parseRow);
}

export async function fetchIndex() {
  const base = getDataBaseUrl();
  const url = `${base}/index.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { latest: "latest.csv", dates: [] };
    }
    return await response.json();
  } catch {
    return { latest: "latest.csv", dates: [] };
  }
}

export async function loadHistoricalRates(dates) {
  const byDate = new Map();
  for (const date of dates) {
    try {
      byDate.set(date, await fetchCsv(`${date}.csv`));
    } catch (err) {
      console.warn(`Skipping ${date}:`, err);
    }
  }
  return byDate;
}
