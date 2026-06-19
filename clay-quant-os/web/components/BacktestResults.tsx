"use client";

import type { BacktestResult } from "@/lib/types";

const fmtUsd = (v: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Metric({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean | null;
}) {
  const color =
    good === undefined || good === null
      ? "text-slate-100"
      : good
      ? "text-emerald-400"
      : "text-rose-400";
  return (
    <div className="rounded-xl bg-ink/50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function BacktestResults({ result }: { result: BacktestResult }) {
  if (result.failure_reason && result.trades_count === 0) {
    return (
      <div className="card border-amber-500/30 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-300">No trades</h3>
        <p className="mt-1 text-sm text-amber-100/80">{result.failure_reason}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-white">Backtest results</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Final capital" value={`${fmtUsd(result.final_capital)}`} />
        <Metric
          label="Total return"
          value={fmtPct(result.total_return)}
          good={result.total_return >= 0}
        />
        <Metric
          label="Max drawdown"
          value={fmtPct(result.max_drawdown)}
          good={false}
        />
        <Metric label="Win rate" value={fmtPct(result.win_rate)} good={result.win_rate >= 0.5} />
        <Metric label="Trades" value={`${result.trades_count}`} />
        <Metric label="Start" value={`${fmtUsd(result.initial_capital)}`} />
      </div>
    </div>
  );
}
