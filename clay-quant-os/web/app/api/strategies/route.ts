// GET  /api/strategies  -> list saved strategies (most recent first)
// POST /api/strategies  -> explicitly save a strategy (the "Save strategy" button)
//
// In single-user local mode without Supabase these degrade gracefully:
// GET returns an empty list and POST echoes the strategy back unsaved.
import { NextRequest, NextResponse } from "next/server";

import { getSupabase } from "@/lib/supabase";
import type { Strategy } from "@/lib/types";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ strategies: [], persisted: false });

  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ strategies: data ?? [], persisted: true });
}

export async function POST(req: NextRequest) {
  const strategy = (await req.json()) as Strategy;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ strategy, persisted: false });
  }

  const { data, error } = await supabase
    .from("strategies")
    .insert({
      idea_id: strategy.idea_id ?? null,
      name: strategy.name,
      description: strategy.description,
      parameters: strategy.parameters,
      code: strategy.code,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ strategy: data, persisted: true });
}
