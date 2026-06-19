# Clay Quant OS — MVP

A C-end SaaS-style personal quant system. You type one fuzzy strategy idea
(e.g. *"试试在预测市场全买高概率一方的收益"*) and the system turns it into a
concrete strategy, backtests it on prediction-market data, and shows you the
return, max drawdown, win rate, sample size, and failure reasons — then lets
you save it and start **paper trading**. Real-money execution is intentionally
disabled (next phase).

This v1 covers **Polymarket prediction-market strategy backtesting** with
**mock historical data** behind a swappable data-source interface.

> Note: this lives in its own `clay-quant-os/` directory and is independent of
> the existing `Murmur` NPC project at the repo root.

---

## 1. Project structure

```
clay-quant-os/
├── README.md                      # this file
├── supabase/
│   └── schema.sql                 # ideas / strategies / backtests tables
├── backtest/                      # Python backtest service (FastAPI)
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI app: /health /strategy/generate /backtest
│       ├── models.py              # pydantic contract shared with the frontend
│       ├── nlp/parser.py          # fuzzy idea text -> concrete strategy + code (rule-based)
│       ├── data/
│       │   ├── base.py            # MarketDataSource interface + factory (SWAP POINT)
│       │   └── mock_polymarket.py # deterministic mock Polymarket data
│       ├── strategies/
│       │   └── threshold.py       # "buy YES if price >= threshold" signal
│       └── engine/
│           └── backtester.py      # event-driven engine: sizing, slippage, settlement, metrics
└── web/                           # Next.js + TypeScript + Tailwind frontend
    ├── package.json
    ├── tailwind.config.ts
    ├── .env.local.example
    ├── lib/
    │   ├── types.ts               # TS mirror of the pydantic models
    │   ├── supabase.ts            # optional Supabase client (degrades gracefully)
    │   └── backtestClient.ts      # server-side fetch wrapper for the Python service
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx               # the single-page UI wiring the whole loop
    │   └── api/                   # route handlers: call Python + persist to Supabase
    │       ├── generate/route.ts
    │       ├── backtest/route.ts
    │       ├── strategies/route.ts
    │       └── paper/route.ts
    └── components/
        ├── StrategyInput.tsx       # 1. idea input + "Generate strategy"
        ├── StrategyExplanation.tsx # 2. strategy explanation + params + "Run backtest"
        ├── BacktestResults.tsx     # 3. return / drawdown / win rate / trades / failure
        ├── DrawdownChart.tsx       # 4. equity curve + drawdown chart (recharts)
        └── CodePreview.tsx         # 5. strategy code preview
```

The required UI pieces all map to components: idea input, generate button,
explanation, backtest results, drawdown chart, code preview, save button,
paper-trading button, and a disabled "confirm live" button with the
"live execution opens next phase" hint.

---

## 2. Install

Requires **Node 18+** and **Python 3.10+**.

```bash
# Python backtest service
cd clay-quant-os/backtest
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../web
npm install
cp .env.local.example .env.local   # optional: fill Supabase vars
```

Supabase is **optional** for the MVP. Without it the full loop still runs;
persistence is skipped (the app logs a warning and returns data in-memory).
To enable persistence, create a Supabase project, run `supabase/schema.sql`
in the SQL editor, and set `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `web/.env.local`.

---

## 3. Run

Open two terminals.

```bash
# Terminal 1 — Python backtest service on :8000
cd clay-quant-os/backtest
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Next.js frontend on :3000
cd clay-quant-os/web
npm run dev
```

Open http://localhost:3000 and complete the loop:
**type an idea → Generate strategy → Run backtest → view drawdown → Save → Start paper trading.**

The frontend reads `BACKTEST_API_URL` (default `http://localhost:8000`) to
reach the Python service.

---

## 4. Default strategy (v1)

> "Buy YES when probability > 70%, hold to settlement."

| Parameter | Default |
| --- | --- |
| Initial capital | 1000 USDC |
| Position size | 5% of capital |
| Buy threshold | 70% |
| Max per market | 10% |
| Fee | 0 |
| Slippage | 1% (applied to entry price) |
| Settlement | YES → 1 USDC/share, NO → 0 |

The engine is event-driven: it walks markets in chronological order, sizes each
position against live equity, applies slippage, and settles at resolution. Max
drawdown is computed from the resulting equity curve. If no market clears the
threshold, the result includes a `failure_reason` instead of crashing.

---

## 5. Next phase — real Polymarket API

The data layer is already abstracted. To go live:

1. Implement `PolymarketDataSource(MarketDataSource)` in
   `backtest/app/data/polymarket.py`, fetching historical markets from
   Polymarket's Gamma/CLOB API (markets, prices, resolutions) and mapping each
   to a `ResolvedMarket` (`yes_price`, `outcome`, `entry_date`,
   `resolution_date`).
2. Register it in `data/base.py::get_data_source` under the `"polymarket"` key.
3. Pass `data_source: "polymarket"` from the frontend (`backtestClient.runBacktest`).

Nothing in the engine, strategy, API, or UI needs to change — the
`ResolvedMarket` shape is the contract. Add response caching and rate-limit
handling in the new source.

---

## 6. Next phase — AI strategy generation

Today `nlp/parser.py::generate` is a deterministic rule-based parser. To make
it AI-native, replace its body with a Claude call (model `claude-opus-4-8` or a
faster Claude) that:

1. Reads the fuzzy idea, asks clarifying questions for missing params (or fills
   defaults), and returns the **same `GeneratedStrategy` shape**
   (`name`, `description`, `parameters`, `code`).
2. Emits real, runnable strategy code (a `should_enter`-style signal) that the
   engine can execute — validate/sandbox it before running.

Because the API contract is unchanged, the frontend and engine keep working.
Add an interactive clarification step in the UI (a follow-up question card)
between "Generate" and "Run backtest" when the model needs more info.
Keep it a single LLM call first — no LangGraph / multi-agent / n8n yet.

---

## 7. Next phase — risk control before real money

Before enabling the (currently disabled) "Confirm live trading" button:

1. **Auth & accounts** — add Supabase Auth, scope every row to `auth.uid()`,
   and tighten the RLS policies in `schema.sql` (currently open for single-user).
2. **Paper → live gate** — require a minimum paper-trading track record
   (sample size, realized drawdown within limits) before unlocking live.
3. **Pre-trade risk checks** — max position size, max per-market exposure, max
   total capital at risk, daily loss limit / kill-switch, slippage guard.
4. **Explicit confirmation flow** — show the order, expected cost, worst-case
   loss, and a typed confirmation; log every approval.
5. **Execution adapter** — only then add a `LiveExecutor` (real Polymarket
   orders) behind the same interface as the paper executor, with idempotency
   and reconciliation.

---

## Design principles (followed here)

- Close the full loop first; mock data is fine to start.
- No over-engineering: one LLM-free parser, one strategy, one engine.
- No LangGraph / n8n / multi-agent at this stage.
- Every external dependency (data, AI, execution) sits behind a swap point.
