import type { ReactNode } from "react";

export function Tile({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5 overflow-hidden border border-[#c5c6c4] bg-white shadow-tile pb-6">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 m-0 px-6 py-4 bg-ink border-b-4 border-hsbc-red">
        <h2 className="flex-1 text-white text-[1.05rem] font-bold tracking-wide">
          {title}
        </h2>
        {aside}
      </header>
      <div className="px-6 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-none border border-line bg-white text-ink px-3 py-2 font-sans focus:outline focus:outline-2 focus:outline-hsbc-red focus:outline-offset-1"
    >
      {children}
    </select>
  );
}

export function CompactTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: string[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-muted text-sm py-6">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto border border-line min-h-16">
      <table className="w-full text-sm">
        <thead className="bg-[#f0f1f2] text-ink">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold capitalize border-b border-[#c5c6c4]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-line hover:bg-panel">
              {cells.map((text, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 ${j === 0 ? "font-semibold" : "tabular-nums"}`}
                >
                  {text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
