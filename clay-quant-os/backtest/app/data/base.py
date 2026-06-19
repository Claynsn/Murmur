"""Data-source abstraction layer.

This is the seam that lets us swap mock data for the real Polymarket API
without touching the backtest engine. Every data source returns a list of
``ResolvedMarket`` objects describing a market we *could* have traded and how
it eventually resolved.

To add a real source later, implement ``MarketDataSource.get_markets`` (see
``mock_polymarket.py`` for the reference implementation) and register it in
``get_data_source``.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import List, Literal


@dataclass
class ResolvedMarket:
    """A historical prediction-market that has already settled.

    Attributes
    ----------
    id:            Stable market identifier.
    question:      Human readable market question.
    yes_price:     YES price (== implied probability) observed at entry, 0..1.
    outcome:       Final resolution, "YES" or "NO".
    entry_date:    ISO date when we observe the price and could enter.
    resolution_date: ISO date the market settled.
    category:      Optional grouping label (sports, politics, crypto, ...).
    """

    id: str
    question: str
    yes_price: float
    outcome: Literal["YES", "NO"]
    entry_date: str
    resolution_date: str
    category: str = "general"


class MarketDataSource(abc.ABC):
    """Interface every data source must implement."""

    @abc.abstractmethod
    def get_markets(self) -> List[ResolvedMarket]:
        """Return the universe of resolved markets, ordered or unordered."""
        raise NotImplementedError


def get_data_source(key: str = "mock") -> MarketDataSource:
    """Factory that resolves a data-source key to an implementation.

    Future real source:

        if key == "polymarket":
            from .polymarket import PolymarketDataSource
            return PolymarketDataSource()
    """
    from .mock_polymarket import MockPolymarketDataSource

    if key in ("mock", "", None):
        return MockPolymarketDataSource()

    # Fall back to mock until a real source is registered.
    return MockPolymarketDataSource()
