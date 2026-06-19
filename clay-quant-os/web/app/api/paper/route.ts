// POST /api/paper
// Starts a (mock) paper-trading session for a strategy. For the MVP this is a
// stub that acknowledges the strategy and returns a fake session handle. The
// next phase wires this to a live mock-fill loop against streaming market data.
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { strategy_id, name } = (await req.json()) as {
    strategy_id?: string;
    name?: string;
  };

  return NextResponse.json({
    status: "started",
    mode: "paper",
    session_id: `paper-${Date.now()}`,
    strategy_id: strategy_id ?? null,
    message:
      `Paper trading started for "${name ?? "strategy"}". ` +
      "Orders are simulated against mock market data — no real funds are used.",
  });
}
