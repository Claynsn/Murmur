// POST /api/generate
// body: { raw_text: string }
// 1. ask the Python service to turn the idea into a concrete strategy
// 2. persist the idea + strategy to Supabase (skipped if not configured)
// 3. return the strategy (with id if saved)
import { NextRequest, NextResponse } from "next/server";

import { generateStrategy } from "@/lib/backtestClient";
import { getSupabase } from "@/lib/supabase";
import type { Strategy } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { raw_text } = await req.json();
    if (!raw_text || typeof raw_text !== "string") {
      return NextResponse.json({ error: "raw_text is required" }, { status: 400 });
    }

    const generated = await generateStrategy(raw_text);

    const strategy: Strategy = { ...generated, raw_text };

    const supabase = getSupabase();
    if (supabase) {
      const { data: idea } = await supabase
        .from("ideas")
        .insert({ raw_text })
        .select()
        .single();

      if (idea) {
        strategy.idea_id = idea.id;
        const { data: saved } = await supabase
          .from("strategies")
          .insert({
            idea_id: idea.id,
            name: generated.name,
            description: generated.description,
            parameters: generated.parameters,
            code: generated.code,
          })
          .select()
          .single();
        if (saved) {
          strategy.id = saved.id;
          strategy.created_at = saved.created_at;
        }
      }
    }

    return NextResponse.json(strategy);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
