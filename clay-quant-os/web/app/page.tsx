"use client";

import { useState } from "react";

import BacktestResults from "@/components/BacktestResults";
import CodePreview from "@/components/CodePreview";
import DrawdownChart from "@/components/DrawdownChart";
import StrategyExplanation from "@/components/StrategyExplanation";
import StrategyInput from "@/components/StrategyInput";
import type { BacktestResult, Strategy } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const [generating, setGenerating] = useState(false);
  const [backtesting, setBacktesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const onGenerate = async () => {
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      const s = await postJson<Strategy>("/api/generate", { raw_text: idea });
      setStrategy(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate strategy");
    } finally {
      setGenerating(false);
    }
  };

  const onBacktest = async () => {
    if (!strategy) return;
    setError(null);
    setBacktesting(true);
    try {
      const r = await postJson<BacktestResult>("/api/backtest", {
        parameters: strategy.parameters,
        strategy_id: strategy.id,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setBacktesting(false);
    }
  };

  const onSave = async () => {
    if (!strategy) return;
    setSaving(true);
    try {
      const { persisted } = await postJson<{ persisted: boolean }>(
        "/api/strategies",
        strategy
      );
      flash(persisted ? "Strategy saved to Supabase." : "Saved locally (Supabase not configured).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onPaper = async () => {
    if (!strategy) return;
    try {
      const r = await postJson<{ message: string }>("/api/paper", {
        strategy_id: strategy.id,
        name: strategy.name,
      });
      flash(r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start paper trading");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Clay Quant OS <span className="text-accent">·</span>{" "}
          <span className="text-base font-normal text-slate-400">Prediction-market backtester</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Describe an idea in one sentence → generate a strategy → backtest on mock Polymarket data.
        </p>
      </header>

      <div className="space-y-5">
        <StrategyInput
          value={idea}
          onChange={setIdea}
          onGenerate={onGenerate}
          loading={generating}
        />

        {error && (
          <div className="card border-rose-500/30 bg-rose-500/5 text-sm text-rose-200">
            {error}
          </div>
        )}

        {strategy && (
          <StrategyExplanation
            strategy={strategy}
            onBacktest={onBacktest}
            loading={backtesting}
          />
        )}

        {result && <BacktestResults result={result} />}
        {result && result.equity_curve.length > 1 && (
          <DrawdownChart curve={result.equity_curve} />
        )}

        {strategy && <CodePreview code={strategy.code} />}

        {strategy && (
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-secondary" onClick={onSave} disabled={saving}>
                {saving ? "Saving…" : "Save strategy"}
              </button>
              <button className="btn-primary" onClick={onPaper}>
                Start paper trading
              </button>
              <button
                className="btn-secondary"
                disabled
                title="Live execution opens in the next phase"
              >
                Confirm live trading
              </button>
              <span className="text-xs text-slate-500">
                Live execution opens in the next phase. Paper trading is fully simulated.
              </span>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border border-white/10 bg-panel px-4 py-2.5 text-sm text-slate-100 shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}
