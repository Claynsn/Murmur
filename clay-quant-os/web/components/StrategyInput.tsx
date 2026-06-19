"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

const EXAMPLES = [
  "试试在预测市场全买高概率一方的收益。",
  "Buy YES when probability is above 70% and hold to settlement.",
  "Only bet on markets priced over 80%.",
];

export default function StrategyInput({ value, onChange, onGenerate, loading }: Props) {
  return (
    <div className="card">
      <label className="mb-2 block text-sm font-medium text-slate-300">
        Describe your strategy idea
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="e.g. 试试在预测市场全买高概率一方的收益。"
        className="w-full resize-none rounded-xl border border-white/10 bg-ink/60 p-3 text-sm outline-none focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChange(ex)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:bg-white/5"
          >
            {ex.length > 38 ? ex.slice(0, 38) + "…" : ex}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <button
          className="btn-primary"
          onClick={onGenerate}
          disabled={loading || !value.trim()}
        >
          {loading ? "Generating…" : "Generate strategy"}
        </button>
      </div>
    </div>
  );
}
