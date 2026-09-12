import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HsbcRowInsight, PeerSeriesPoint, TrendPoint } from "../lib/types";

export const BANK_COLORS: Record<string, string> = {
  hsbc: "#db0011",
  dbs: "#5b7c99",
  ocbc: "#8a8d8f",
  uob: "#2e2e2e",
};

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #d7d8d6",
  color: "#1d1d1b",
  fontSize: 12,
};

function Empty({ text }: { text: string }) {
  return <p className="text-muted text-sm py-12 text-center">{text}</p>;
}

export function CompetitorTrendChart({
  data,
  banks,
  caption,
}: {
  data: TrendPoint[];
  banks: string[];
  caption: string;
}) {
  if (data.length === 0) {
    return (
      <Empty text="No historical data yet. Run the scraper on multiple days to see trends." />
    );
  }
  const byDate = new Map<string, Record<string, string | number>>();
  for (const point of data) {
    const row = byDate.get(point.date) ?? { date: point.date };
    row[point.bank] = point.rate;
    byDate.set(point.date, row);
  }
  const series = [...byDate.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const peers = banks.filter((b) => b !== "hsbc");
  const ordered = [...peers, ...banks.filter((b) => b === "hsbc")];

  return (
    <div>
      <p className="text-muted text-sm mb-2">{caption}</p>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#d7d8d6" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#5c5c5c", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
              tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) =>
                typeof value === "number" ? `${value.toFixed(2)}%` : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#5c5c5c" }} />
            {ordered.map((bank) => (
              <Line
                key={bank}
                type="monotone"
                dataKey={bank}
                name={bank.toUpperCase()}
                stroke={BANK_COLORS[bank] ?? "#8a8d8f"}
                strokeWidth={bank === "hsbc" ? 2.5 : 2}
                dot={{ r: 3, fill: BANK_COLORS[bank] ?? "#8a8d8f" }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PeerMedianChart({
  series,
  caption,
}: {
  series: PeerSeriesPoint[];
  caption: string;
}) {
  if (series.length === 0) {
    return <Empty text="No historical HSBC vs peer median yet." />;
  }
  return (
    <div>
      <p className="text-muted text-sm mb-2">{caption}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#d7d8d6" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
              tickFormatter={(d) => (typeof d === "string" && d.length >= 10 ? d.slice(5) : d)}
            />
            <YAxis
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
              tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) =>
                typeof value === "number" ? `${value.toFixed(2)}%` : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#5c5c5c" }} />
            <Line
              type="monotone"
              dataKey="peerMedian"
              name="Peer median"
              stroke="#8a8d8f"
              strokeDasharray="4 3"
              strokeWidth={2}
              dot={{ r: 3, fill: "#8a8d8f" }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="hsbc"
              name="HSBC"
              stroke="#db0011"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#db0011" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RankChart({
  series,
  caption,
}: {
  series: PeerSeriesPoint[];
  caption: string;
}) {
  if (series.length === 0) {
    return <Empty text="No historical HSBC rank yet." />;
  }
  return (
    <div>
      <p className="text-muted text-sm mb-2">{caption}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#d7d8d6" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
              tickFormatter={(d) => (typeof d === "string" && d.length >= 10 ? d.slice(5) : d)}
            />
            <YAxis
              allowDecimals
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
              tickFormatter={(v) => Number(v).toFixed(1)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) =>
                typeof value === "number" ? value.toFixed(1) : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#5c5c5c" }} />
            <Line
              type="monotone"
              dataKey="rank"
              name="HSBC rank (1 = cheapest)"
              stroke="#db0011"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#db0011" }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HeadroomBars({
  rows,
  caption,
}: {
  rows: HsbcRowInsight[];
  caption: string;
}) {
  const data = rows.filter((r) => r.headroom != null);
  if (data.length === 0) {
    return <Empty text="No HSBC headroom on this date and insight band." />;
  }
  const height = Math.min(640, 48 + data.length * 22);
  return (
    <div>
      <p className="text-muted text-sm mb-2">{caption}</p>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke="#d7d8d6" strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fill: "#5c5c5c", fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="base_currency"
              width={56}
              tick={{ fill: "#5c5c5c", fontSize: 12 }}
            />
            <ReferenceLine x={0} stroke="#1d1d1b" />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) =>
                typeof value === "number" ? `${value.toFixed(2)} pp` : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#5c5c5c" }} />
            <Bar dataKey="headroom" name="Headroom vs peer median">
              {data.map((row) => (
                <Cell
                  key={row.base_currency}
                  fill={(row.headroom ?? 0) >= 0 ? "#8a8d8f" : "#db0011"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
