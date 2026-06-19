// POST /api/backtest
// body: { parameters: StrategyParameters, strategy_id?: string }
// Runs the backtest via the Python service, then persists the result row.
import { NextRequest, NextResponse } from "next/server";

import { runBacktest } from "@/lib/backtestClient";
import { getSupabase } from "@/lib/supabase";
import type { BacktestResult, StrategyParameters } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { parameters, strategy_id } = (await req.json()) as {
      parameters: StrategyParameters;
      strategy_id?: string;
    };
    if (!parameters) {
      return NextResponse.json({ error: "parameters is required" }, { status: 400 });
    }

    const result: BacktestResult = await runBacktest(parameters);

    const supabase = getSupabase();
    if (supabase && strategy_id) {
      await supabase.from("backtests").insert({
        strategy_id,
        initial_capital: result.initial_capital,
        final_capital: result.final_capital,
        total_return: result.total_return,
        max_drawdown: result.max_drawdown,
        win_rate: result.win_rate,
        trades_count: result.trades_count,
        equity_curve: result.equity_curve,
        trades: result.trades,
      });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
