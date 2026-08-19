import {
  getRateValue,
  getTransactionBand,
  isLowerBetter,
  isStandardizedRow,
  sortTransactionBands,
  transactionBandSortKey,
} from "./normalize.js";

export function filterStandardizedRows(rows) {
  return rows.filter(isStandardizedRow);
}

export function buildComparisonRows(
  rows,
  rateType,
  baseCurrency,
  transactionValue,
) {
  const filtered = rows.filter((row) => {
    if (!isStandardizedRow(row)) return false;
    if (baseCurrency !== "all" && row.base_currency !== baseCurrency) {
      return false;
    }
    const band = getTransactionBand(row);
    if (transactionValue !== "all" && band !== transactionValue) {
      return false;
    }
    return true;
  });

  const groups = new Map();
  for (const row of filtered) {
    const band = getTransactionBand(row);
    const key = `${row.currency_pair}|${band}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const comparison = [];

  for (const [, bankRows] of groups) {
    const sample = bankRows[0];
    const banks = {};

    for (const row of bankRows) {
      const marginPct = getRateValue(row, rateType);
      banks[row.bank] = {
        rawRate: marginPct,
        normalizedRate: marginPct,
        last_updated: row.last_updated,
      };
    }

    const candidates = Object.entries(banks).filter(
      ([, v]) => v.normalizedRate != null,
    );
    if (candidates.length === 0) {
      continue;
    }
    const lower = isLowerBetter(rateType);
    const bestBank = candidates.reduce((best, [bank, v]) => {
      const bestVal = banks[best].normalizedRate;
      const val = v.normalizedRate;
      if (lower) return val < bestVal ? bank : best;
      return val > bestVal ? bank : best;
    }, candidates[0][0]);

    comparison.push({
      currency_pair: sample.currency_pair,
      base_currency: sample.base_currency,
      transaction_value: getTransactionBand(sample),
      banks,
      bestBank,
    });
  }

  return comparison.sort((a, b) => {
    const currencyCmp = a.base_currency.localeCompare(b.base_currency);
    if (currencyCmp !== 0) return currencyCmp;
    const bandCmp =
      transactionBandSortKey(a.transaction_value) -
      transactionBandSortKey(b.transaction_value);
    if (bandCmp !== 0) return bandCmp;
    return a.currency_pair.localeCompare(b.currency_pair);
  });
}

export function uniqueBaseCurrencies(rows, rateType) {
  const relevant = rateType
    ? rows.filter(
        (row) => isStandardizedRow(row) && getRateValue(row, rateType) != null,
      )
    : rows;
  return [...new Set(relevant.map((r) => r.base_currency))].sort();
}

export function uniqueTransactionValues(rows) {
  const values = rows
    .filter(isStandardizedRow)
    .map((r) => getTransactionBand(r))
    .filter((v) => v.length > 0);
  return sortTransactionBands([...new Set(values)]);
}

export function uniqueBanks(rows) {
  return [...new Set(rows.map((r) => r.bank))].sort();
}
