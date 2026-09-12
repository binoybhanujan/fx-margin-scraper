import type { ComparisonRow } from "../lib/types";
import { HSBC_BANK } from "../lib/insights";
import { formatRate } from "../lib/normalize";

interface ComparisonTableProps {
  rows: ComparisonRow[];
  banks: string[];
  loading: boolean;
}

export function ComparisonTable({ rows, banks, loading }: ComparisonTableProps) {
  if (loading) {
    return <p className="text-muted text-sm">Loading rates…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="text-muted text-sm py-8 text-center">
        No margins match the selected filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="min-w-[40rem] w-full text-sm">
        <thead className="bg-[#f0f1f2] text-ink">
          <tr>
            <th className="px-4 py-3 text-left font-semibold border-b border-[#c5c6c4]">
              Pair
            </th>
            <th className="px-4 py-3 text-left font-semibold border-b border-[#c5c6c4]">
              Transaction band
            </th>
            {banks.map((bank) => (
              <th
                key={bank}
                className={`px-4 py-3 text-left font-semibold capitalize border-b ${
                  bank === HSBC_BANK
                    ? "bg-hsbc-tint text-hsbc-red border-b-2 border-hsbc-red"
                    : "border-[#c5c6c4]"
                }`}
              >
                {bank}
                <span className="block text-xs font-normal normal-case text-muted">
                  Margin % of mid
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left font-semibold border-b border-[#c5c6c4]">
              Best for customer
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.currency_pair}-${row.transaction_value}`}
              className="border-t border-line hover:bg-panel"
            >
              <td className="px-4 py-3 font-semibold">{row.currency_pair}</td>
              <td className="px-4 py-3 text-muted">{row.transaction_value}</td>
              {banks.map((bank) => {
                const cell = row.banks[bank];
                const isBest =
                  row.bestBank === bank && cell?.normalizedRate != null;
                return (
                  <td
                    key={bank}
                    className={`px-4 py-3 tabular-nums ${
                      isBest ? "text-green-700 font-semibold" : ""
                    } ${bank === HSBC_BANK ? "bg-hsbc-tint" : ""}`}
                  >
                    {formatRate(cell?.normalizedRate ?? null)}
                  </td>
                );
              })}
              <td className="px-4 py-3 capitalize text-green-700 font-semibold">
                {row.bestBank ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
