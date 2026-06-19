"""Event-driven backtest engine for prediction-market buy-and-hold.

The engine processes markets as a chronological stream of two events:

* OPEN  (at ``entry_date``)      -> deduct cost from cash, mark position at cost
* CLOSE (at ``resolution_date``) -> receive payout (1 USDC/share if YES else 0)

Equity is tracked as ``cash + open_position_cost_basis`` so the equity curve
moves only when a position settles, which is exactly when realized PnL occurs.
This yields a clean curve for computing max drawdown.

Sizing rules (all fractions of *current* equity):
    position_pct     -> target capital per trade (default 5%)
    max_market_pct   -> hard cap per single market (default 10%)
Slippage is applied to the entry price; fee is charged on notional cost.
"""
from __future__ import annotations

from typing import List

from ..data.base import get_data_source
from ..models import (
    BacktestResult,
    EquityPoint,
    StrategyParameters,
    Trade,
)
from ..strategies.threshold import should_enter


def run_backtest(params: StrategyParameters, data_source: str = "mock") -> BacktestResult:
    source = get_data_source(data_source)
    markets = source.get_markets()

    # Chronological event stream. open=True means entry, open=False means settle.
    # We tag entries with the market so we can size against live equity.
    entries = sorted(markets, key=lambda m: m.entry_date)

    cash = params.initial_capital
    open_cost_basis = 0.0  # sum of cost of currently-open positions
    equity_curve: List[EquityPoint] = [
        EquityPoint(t=entries[0].entry_date if entries else "", equity=cash)
    ]
    trades: List[Trade] = []

    # Build (date, kind, payload) events. Open events reference the market;
    # close events carry the resolved trade so we know the payout.
    pending_closes: List[tuple[str, Trade]] = []

    def equity_now() -> float:
        return cash + open_cost_basis

    def flush_closes_before(d: str) -> None:
        nonlocal cash, open_cost_basis
        pending_closes.sort(key=lambda x: x[0])
        while pending_closes and pending_closes[0][0] <= d:
            close_date, tr = pending_closes.pop(0)
            cash += tr.payout
            open_cost_basis -= tr.cost
            equity_curve.append(EquityPoint(t=close_date, equity=round(equity_now(), 4)))

    for market in entries:
        # Settle anything that resolved before this entry so equity/cash are current.
        flush_closes_before(market.entry_date)

        if not should_enter(market, params):
            continue

        equity = equity_now()
        target = equity * min(params.position_pct, params.max_market_pct)
        if target <= 0 or cash <= 0:
            continue
        notional = min(target, cash)  # can't spend more cash than we hold

        effective_price = market.yes_price * (1 + params.slippage)
        if effective_price <= 0:
            continue
        fee_cost = notional * params.fee
        spend = notional + fee_cost
        if spend > cash:
            spend = cash
            notional = spend / (1 + params.fee)
            fee_cost = spend - notional

        shares = notional / effective_price
        payout = shares * 1.0 if market.outcome == "YES" else 0.0
        pnl = payout - spend

        cash -= spend
        open_cost_basis += spend

        trade = Trade(
            market_id=market.id,
            question=market.question,
            entry_price=market.yes_price,
            effective_price=round(effective_price, 4),
            outcome=market.outcome,
            shares=round(shares, 4),
            cost=round(spend, 4),
            payout=round(payout, 4),
            pnl=round(pnl, 4),
            entry_date=market.entry_date,
            resolution_date=market.resolution_date,
        )
        trades.append(trade)
        pending_closes.append((market.resolution_date, trade))

    # Settle all remaining open positions.
    flush_closes_before("9999-12-31")

    final_capital = round(equity_now(), 4)
    total_return = (
        (final_capital - params.initial_capital) / params.initial_capital
        if params.initial_capital
        else 0.0
    )
    max_drawdown = _max_drawdown([p.equity for p in equity_curve])
    wins = sum(1 for t in trades if t.pnl > 0)
    win_rate = wins / len(trades) if trades else 0.0

    failure_reason = None
    if not trades:
        failure_reason = (
            f"No market met the entry condition (YES price >= {params.threshold:.0%}). "
            "Try lowering the threshold."
        )

    return BacktestResult(
        initial_capital=params.initial_capital,
        final_capital=final_capital,
        total_return=round(total_return, 4),
        max_drawdown=round(max_drawdown, 4),
        win_rate=round(win_rate, 4),
        trades_count=len(trades),
        equity_curve=equity_curve,
        trades=trades,
        failure_reason=failure_reason,
    )


def _max_drawdown(equity: List[float]) -> float:
    """Return the worst peak-to-trough drop as a positive fraction (0..1)."""
    peak = float("-inf")
    max_dd = 0.0
    for v in equity:
        peak = max(peak, v)
        if peak > 0:
            dd = (peak - v) / peak
            max_dd = max(max_dd, dd)
    return max_dd
