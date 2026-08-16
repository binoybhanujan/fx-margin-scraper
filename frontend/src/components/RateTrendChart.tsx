import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../lib/types";

interface RateTrendChartProps {
  data: TrendPoint[];
  banks: string[];
  currencyPair: string;
  rateLabel: string;
}

const COLORS: Record<string, string> = {
  dbs: "#3b82f6",
  ocbc: "#f59e0b",
};

export function RateTrendChart({
  data,
  banks,
  currencyPair,
  rateLabel,
}: RateTrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-slate-400 text-sm py-12 text-center">
        No historical data yet. Run the scraper on multiple days to see trends.
      </p>
    );
  }

  const chartData = data.reduce<
    Record<string, Record<string, number | string>>
  >((acc, point) => {
    if (!acc[point.date]) acc[point.date] = { date: point.date };
    acc[point.date][point.bank] = point.rate;
    return acc;
  }, {});

  const series = Object.values(chartData).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  return (
    <div className="h-80 w-full">
      <p className="mb-2 text-sm text-slate-400">
        {currencyPair} — {rateLabel} (SGD per 1 FCY)
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {banks.map((bank) => (
            <Line
              key={bank}
              type="monotone"
              dataKey={bank}
              name={bank.toUpperCase()}
              stroke={COLORS[bank] ?? "#a78bfa"}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
