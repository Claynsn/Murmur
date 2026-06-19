"use client";

import type { Strategy } from "@/lib/types";

const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;

export default function StrategyExplanation({
  strategy,
  onBacktest,
  loading,
}: {
  strategy: Strategy;
  onBacktest: () => void;
  loading: boolean;
}) {
  const p = strategy.parameters;
  const rows: [string, string][] = [
    ["Initial capital", `${p.initial_capital} USDC`],
    ["Position size", fmtPct(p.position_pct)],
    ["Buy threshold", fmtPct(p.threshold)],
    ["Max per market", fmtPct(p.max_market_pct)],
    ["Fee", fmtPct(p.fee)],
    ["Slippage", fmtPct(p.slippage)],
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{strategy.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {strategy.description}
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={onBacktest} disabled={loading}>
          {loading ? "Running…" : "Run backtest"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-ink/50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{k}</div>
            <div className="text-sm font-medium text-slate-100">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
