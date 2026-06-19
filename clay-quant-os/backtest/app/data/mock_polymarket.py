"""Mock Polymarket historical data.

Generates a deterministic universe of resolved prediction markets so the
full backtest loop runs without any network access. The shape mirrors what
a real Polymarket adapter would return (see ``ResolvedMarket``), so swapping
in the live API later only changes this file.

Design notes
------------
* Outcomes are sampled so that higher YES prices win more often (markets are
  roughly calibrated), but with deliberate noise + a few "favorite-longshot"
  upsets. This produces a realistic equity curve *with* drawdowns instead of a
  trivially winning strategy.
* Everything is seeded for reproducibility.
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from typing import List

from .base import MarketDataSource, ResolvedMarket

_CATEGORIES = ["politics", "sports", "crypto", "economy", "pop-culture"]

_TEMPLATES = [
    "Will {team} win their next match?",
    "Will {asset} close above its weekly open?",
    "Will the proposal pass before the deadline?",
    "Will the candidate lead in the next poll?",
    "Will the metric exceed the consensus estimate?",
    "Will the event be confirmed this week?",
]

_FILLERS = ["the Tigers", "BTC", "ETH", "the incumbent", "the index", "the launch"]


class MockPolymarketDataSource(MarketDataSource):
    """Deterministic mock implementation of :class:`MarketDataSource`."""

    def __init__(self, n_markets: int = 80, seed: int = 42) -> None:
        self.n_markets = n_markets
        self.seed = seed

    def get_markets(self) -> List[ResolvedMarket]:
        rng = random.Random(self.seed)
        start = date(2024, 1, 1)
        markets: List[ResolvedMarket] = []

        for i in range(self.n_markets):
            # YES price skewed toward the extremes, like real markets.
            yes_price = round(rng.betavariate(2.0, 2.0) * 0.9 + 0.05, 3)

            # Calibrated-ish resolution with noise so high-prob bets still lose
            # sometimes (creates realistic drawdown).
            win_prob = min(0.97, max(0.03, yes_price + rng.uniform(-0.18, 0.10)))
            outcome = "YES" if rng.random() < win_prob else "NO"

            entry = start + timedelta(days=i * 3)
            resolution = entry + timedelta(days=rng.randint(2, 14))

            template = rng.choice(_TEMPLATES)
            question = template.format(
                team=rng.choice(_FILLERS),
                asset=rng.choice(["BTC", "ETH", "SOL"]),
            )

            markets.append(
                ResolvedMarket(
                    id=f"mock-{i:03d}",
                    question=question,
                    yes_price=yes_price,
                    outcome=outcome,  # type: ignore[arg-type]
                    entry_date=entry.isoformat(),
                    resolution_date=resolution.isoformat(),
                    category=rng.choice(_CATEGORIES),
                )
            )

        return markets
