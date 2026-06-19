"""FastAPI entrypoint for the Clay Quant OS backtest service.

Endpoints
---------
GET  /health             -> liveness check
POST /strategy/generate  -> fuzzy idea text  -> concrete strategy + code
POST /backtest           -> strategy params  -> backtest metrics + curves

The Next.js frontend calls these through its own API routes (which also
persist results to Supabase). This service stays stateless.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .engine.backtester import run_backtest
from .models import (
    BacktestRequest,
    BacktestResult,
    GenerateRequest,
    GeneratedStrategy,
)
from .nlp.parser import generate as generate_strategy

app = FastAPI(title="Clay Quant OS — Backtest Service", version="0.1.0")

# Allow the local Next.js dev server to call us directly during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "clay-quant-os-backtest"}


@app.post("/strategy/generate", response_model=GeneratedStrategy)
def strategy_generate(req: GenerateRequest) -> GeneratedStrategy:
    return generate_strategy(req.raw_text)


@app.post("/backtest", response_model=BacktestResult)
def backtest(req: BacktestRequest) -> BacktestResult:
    return run_backtest(req.parameters, data_source=req.data_source)
