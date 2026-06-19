"""Shared pydantic models for the Clay Quant OS backtest service.

These models define the contract between the Next.js frontend and the
Python backtest engine. Keep them stable / additive so the frontend does
not break when we extend the engine.
"""
from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Strategy parameters
# ---------------------------------------------------------------------------
class StrategyParameters(BaseModel):
    """Tunable parameters for the threshold buy-and-hold strategy.

    All monetary values are in USDC. Percentages are expressed as fractions
    (e.g. 0.05 == 5%).
    """

    initial_capital: float = Field(1000, description="Starting capital in USDC")
    position_pct: float = Field(0.05, description="Capital fraction per trade")
    threshold: float = Field(0.70, description="Minimum YES price to buy")
    max_market_pct: float = Field(0.10, description="Max capital fraction per market")
    fee: float = Field(0.0, description="Fee fraction per trade")
    slippage: float = Field(0.01, description="Slippage fraction applied on entry")


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    raw_text: str


class BacktestRequest(BaseModel):
    parameters: StrategyParameters = Field(default_factory=StrategyParameters)
    # Which mock dataset / future data source to use.
    data_source: str = Field("mock", description="Data source key, e.g. 'mock' or 'polymarket'")


# ---------------------------------------------------------------------------
# Strategy generation response
# ---------------------------------------------------------------------------
class GeneratedStrategy(BaseModel):
    name: str
    description: str
    parameters: StrategyParameters
    code: str


# ---------------------------------------------------------------------------
# Backtest response
# ---------------------------------------------------------------------------
class EquityPoint(BaseModel):
    t: str  # ISO date of the event
    equity: float


class Trade(BaseModel):
    market_id: str
    question: str
    entry_price: float  # observed YES price at entry
    effective_price: float  # price after slippage
    outcome: Literal["YES", "NO"]
    shares: float
    cost: float
    payout: float
    pnl: float
    entry_date: str
    resolution_date: str


class BacktestResult(BaseModel):
    initial_capital: float
    final_capital: float
    total_return: float
    max_drawdown: float
    win_rate: float
    trades_count: int
    equity_curve: List[EquityPoint]
    trades: List[Trade]
    failure_reason: str | None = None
