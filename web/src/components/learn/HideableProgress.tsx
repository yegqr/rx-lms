"use client";

import { useEffect, useState } from "react";

export function HideableProgress({ pct }: { pct: number }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem("rx-hide-progress") === "1");
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem("rx-hide-progress", next ? "1" : "0");
  }

  if (hidden) {
    return (
      <button
        onClick={toggle}
        className="text-xs text-kse-muted hover:text-kse-navy"
        title="Show progress"
      >
        {pct}% ▸
      </button>
    );
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-kse-line">
        <div className="h-full rounded-full bg-kse-green transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-kse-muted">{pct}%</span>
      <button
        onClick={toggle}
        className="text-kse-muted hover:text-kse-navy"
        title="Hide progress"
        aria-label="Hide progress"
      >
        ×
      </button>
    </div>
  );
}
