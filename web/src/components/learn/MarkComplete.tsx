"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkComplete({
  itemId,
  completed,
}: {
  itemId: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, completed: !completed }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={
        completed
          ? "rounded-lg border border-kse-green bg-green-50 px-4 py-2 text-sm font-medium text-kse-green"
          : "rounded-lg bg-kse-navy px-4 py-2 text-sm font-semibold text-white hover:bg-kse-navy-700"
      }
    >
      {completed ? "✓ Completed" : busy ? "Saving…" : "Mark complete"}
    </button>
  );
}
