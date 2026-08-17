import type { RateType } from "../lib/types";

interface FiltersProps {
  dates: string[];
  currencies: string[];
  transactionValues: string[];
  selectedDate: string;
  baseCurrency: string;
  transactionValue: string;
  rateType: RateType;
  onDateChange: (value: string) => void;
  onBaseCurrencyChange: (value: string) => void;
  onTransactionValueChange: (value: string) => void;
  onRateTypeChange: (value: RateType) => void;
}

export function Filters({
  dates,
  currencies,
  transactionValues,
  selectedDate,
  baseCurrency,
  transactionValue,
  rateType,
  onDateChange,
  onBaseCurrencyChange,
  onTransactionValueChange,
  onRateTypeChange,
}: FiltersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-400">Date</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
        >
          {dates.map((date) => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-400">Currency</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          value={baseCurrency}
          onChange={(e) => onBaseCurrencyChange(e.target.value)}
        >
          <option value="all">All currencies</option>
          {currencies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-400">Standardized band</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          value={transactionValue}
          onChange={(e) => onTransactionValueChange(e.target.value)}
        >
          <option value="all">All bands</option>
          {transactionValues.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-slate-400">Margin type</span>
        <select
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          value={rateType}
          onChange={(e) => onRateTypeChange(e.target.value as RateType)}
        >
          <option value="tt_od_sell">Buy FCY (sell margin % of mid)</option>
          <option value="tt_buy">Sell FCY (buy margin % of mid)</option>
          <option value="od_buy">Sell FCY OD (OD buy margin % of mid)</option>
        </select>
      </label>
    </div>
  );
}
