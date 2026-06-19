"use client";

import { useState } from "react";

export default function CodePreview({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Strategy code</h3>
        <button className="btn-secondary !py-1.5 !text-xs" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto rounded-xl bg-ink/70 p-4 text-xs leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
