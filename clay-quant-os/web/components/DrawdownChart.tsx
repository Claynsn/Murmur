"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EquityPoint } from "@/lib/types";

// Convert the equity curve into a running drawdown series (negative %).
function toDrawdown(curve: EquityPoint[]) {
  let peak = -Infinity;
  return curve.map((pt) => {
    peak = Math.max(peak, pt.equity);
    const dd = peak > 0 ? (pt.equity - peak) / peak : 0;
    return { t: pt.t, drawdown: +(dd * 100).toFixed(2), equity: pt.equity };
  });
}

export default function DrawdownChart({ curve }: { curve: EquityPoint[] }) {
  if (!curve || curve.length === 0) return null;
  const data = toDrawdown(curve);

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-white">Equity & drawdown</h3>

      <div className="mb-2 text-xs text-slate-500">Equity curve (USDC)</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={40} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0b0f17", border: "1px solid #ffffff22", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Line type="monotone" dataKey="equity" stroke="#5eead4" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mb-2 mt-4 text-xs text-slate-500">Drawdown (%)</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={40} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{ background: "#0b0f17", border: "1px solid #ffffff22", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [`${v}%`, "Drawdown"]}
          />
          <Area type="monotone" dataKey="drawdown" stroke="#fb7185" fill="#fb718533" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
