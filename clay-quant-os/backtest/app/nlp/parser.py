"""Turn a fuzzy strategy idea into a concrete, runnable strategy.

v1 is a deterministic rule-based parser: it reads the raw text, pulls out a
threshold if the user mentioned one (e.g. "70%", "0.7", "大于 65%"), and falls
back to sensible defaults otherwise. It also emits a human-readable
description and a Python code preview reflecting the chosen parameters.

This is the explicit seam for AI generation later: replace ``generate`` with
a Claude call that returns the same ``GeneratedStrategy`` shape. The frontend
and engine do not need to change. See README "下一阶段：接入 AI".
"""
from __future__ import annotations

import re

from ..models import GeneratedStrategy, StrategyParameters

_PCT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%")
_FRAC_RE = re.compile(r"0?\.(\d+)")


def _extract_threshold(text: str) -> float | None:
    """Find a probability threshold in the text; return as a 0..1 fraction."""
    m = _PCT_RE.search(text)
    if m:
        val = float(m.group(1)) / 100.0
        if 0 < val < 1:
            return round(val, 4)
    m = _FRAC_RE.search(text)
    if m:
        val = float("0." + m.group(1))
        if 0 < val < 1:
            return round(val, 4)
    return None


def _build_code(params: StrategyParameters) -> str:
    """Render a readable Python snippet that mirrors the live engine logic."""
    return f'''# Clay Quant OS — Strategy v1: Threshold Buy-and-Hold
# Buy YES when the implied probability is high, hold to settlement.

PARAMS = dict(
    initial_capital={params.initial_capital},   # USDC
    position_pct={params.position_pct},          # capital per trade
    threshold={params.threshold},                # buy YES when price >= this
    max_market_pct={params.max_market_pct},      # hard cap per market
    fee={params.fee},
    slippage={params.slippage},                  # applied to entry price
)


def should_enter(market, p=PARAMS):
    """Signal: enter YES if the market is priced above the threshold."""
    return market["yes_price"] >= p["threshold"]


# Settlement: YES -> 1 USDC per share, NO -> 0.
# Sizing, cash and slippage are handled by the backtest engine.
'''


def generate(raw_text: str) -> GeneratedStrategy:
    threshold = _extract_threshold(raw_text) or 0.70
    params = StrategyParameters(threshold=threshold)

    name = f"Buy YES > {threshold:.0%}, hold to settlement"
    description = (
        f"This strategy scans Polymarket markets and buys the YES outcome "
        f"whenever its price (implied probability) is at or above "
        f"{threshold:.0%}. Each position uses {params.position_pct:.0%} of "
        f"current capital, capped at {params.max_market_pct:.0%} per market, "
        f"with {params.slippage:.0%} slippage on entry and no fees. Positions "
        f"are held until the market settles: YES pays 1 USDC per share, NO "
        f"pays 0. Starting capital is {params.initial_capital:.0f} USDC."
    )

    return GeneratedStrategy(
        name=name,
        description=description,
        parameters=params,
        code=_build_code(params),
    )
