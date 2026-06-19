-- Clay Quant OS — database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor (or `supabase db push`) to provision
-- the tables used by the MVP. Single-user / no-auth mode: RLS is left open.

create extension if not exists "pgcrypto";

-- 1. ideas: the raw fuzzy strategy text the user typed.
create table if not exists ideas (
  id          uuid primary key default gen_random_uuid(),
  raw_text    text not null,
  created_at  timestamptz not null default now()
);

-- 2. strategies: a concrete strategy generated from an idea.
create table if not exists strategies (
  id          uuid primary key default gen_random_uuid(),
  idea_id     uuid references ideas (id) on delete set null,
  name        text not null,
  description text not null,
  parameters  jsonb not null,
  code        text not null,
  created_at  timestamptz not null default now()
);

-- 3. backtests: results of running a strategy against a dataset.
create table if not exists backtests (
  id              uuid primary key default gen_random_uuid(),
  strategy_id     uuid references strategies (id) on delete cascade,
  initial_capital numeric not null,
  final_capital   numeric not null,
  total_return    numeric not null,
  max_drawdown    numeric not null,
  win_rate        numeric not null,
  trades_count    integer not null,
  equity_curve    jsonb not null,
  trades          jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_strategies_created_at on strategies (created_at desc);
create index if not exists idx_backtests_strategy on backtests (strategy_id);

-- ---------------------------------------------------------------------------
-- MVP single-user access. The frontend uses the anon key directly, so we
-- enable RLS and add permissive policies. TIGHTEN THESE before adding auth /
-- real money: scope every row to auth.uid().
-- ---------------------------------------------------------------------------
alter table ideas      enable row level security;
alter table strategies enable row level security;
alter table backtests  enable row level security;

create policy "mvp open ideas"      on ideas      for all using (true) with check (true);
create policy "mvp open strategies" on strategies for all using (true) with check (true);
create policy "mvp open backtests"  on backtests  for all using (true) with check (true);
