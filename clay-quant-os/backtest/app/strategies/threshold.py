"""Threshold buy-and-hold strategy.

Strategy v1: "Buy YES when the YES price (implied probability) is above a
threshold, and hold the position until the market settles."

A strategy is intentionally just a *signal function*: given a market and the
parameters, decide whether to enter. The engine owns sizing, cash, slippage
and settlement. This keeps strategies tiny and easy to generate/extend later.
"""
from __future__ import annotations

from ..data.base import ResolvedMarket
from ..models import StrategyParameters


def should_enter(market: ResolvedMarket, params: StrategyParameters) -> bool:
    """Return True if we should buy YES on this market."""
    return market.yes_price >= params.threshold
