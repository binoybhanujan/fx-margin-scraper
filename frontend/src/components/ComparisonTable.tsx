import type { ComparisonRow } from "../lib/types";
import { formatRate } from "../lib/normalize";

interface ComparisonTableProps {
  rows: ComparisonRow[];
  banks: string[];
}

export function ComparisonTable({ rows, banks }: ComparisonTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-8 text-center">
        No margins match the selected filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/80 text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Pair</th>
            <th className="px-4 py-3 text-left">Transaction band</th>
            {banks.map((bank) => (
              <th key={bank} className="px-4 py-3 text-left capitalize">
                {bank}
                <span className="block text-xs font-normal text-slate-500">
                  Margin % of mid
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left">Best</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.currency_pair}-${row.transaction_value}`}
              className="border-t border-slate-800 hover:bg-slate-900/50"
            >
              <td className="px-4 py-3 font-medium">{row.currency_pair}</td>
              <td className="px-4 py-3 text-slate-300">{row.transaction_value}</td>
              {banks.map((bank) => {
                const cell = row.banks[bank];
                const isBest = row.bestBank === bank && cell?.normalizedRate != null;
                return (
                  <td
                    key={bank}
                    className={`px-4 py-3 tabular-nums ${
                      isBest ? "text-emerald-400 font-semibold" : ""
                    }`}
                  >
                    {formatRate(cell?.normalizedRate ?? null)}
                  </td>
                );
              })}
              <td className="px-4 py-3 capitalize text-emerald-400">
                {row.bestBank ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
