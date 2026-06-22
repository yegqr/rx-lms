"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import confetti from "canvas-confetti";

function celebrate() {
  const colors = ["#003863", "#f1e935", "#a7c539"];
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 150);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 150);
}

interface Result {
  score: number;
  total: number;
  passed: boolean;
  threshold: number;
  perItem?: boolean[];
}

/**
 * Ordering exercise. `items` arrives in the CORRECT order. We present a shuffled
 * copy and let the student reorder it with up/down buttons.
 *
 * PROTOCOL (must match /api/quiz gradeAlternate):
 *   `order` is the student's arrangement as original indices into `items`.
 *   We send answers = order. The grader treats answers[p] === p as a correct
 *   placement (position p, 0-based). total = items.length.
 */
export function OrderingExercise({
  itemId,
  instructions,
  prompt,
  items,
}: {
  itemId: string;
  instructions?: string;
  prompt?: string;
  items: string[];
}) {
  const router = useRouter();

  // Fisher-Yates shuffle of original indices, avoiding the already-correct
  // order when there is more than one item. Plain function so Math.random is
  // never invoked during render (only in the lazy initializer / on retry).
  function shuffledOrder() {
    const n = items.length;
    const idx = items.map((_, i) => i);
    for (let attempt = 0; attempt < 8; attempt++) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      if (n < 2 || idx.some((v, i) => v !== i)) break;
    }
    return idx;
  }

  // `order` holds original indices (into `items`) in the student's chosen order.
  const [order, setOrder] = useState<number[]>(() => shuffledOrder());
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  function move(pos: number, dir: -1 | 1) {
    if (result) return;
    const target = pos + dir;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[pos], next[target]] = [next[target], next[pos]];
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, answers: order }),
    });
    const data = (await res.json()) as Result;
    setResult(data);
    setBusy(false);
    if (data.passed) {
      celebrate();
      router.refresh();
    }
  }

  function retry() {
    setResult(null);
    setOrder(shuffledOrder());
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-kse-line bg-kse-navy-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-kse-navy">Put these in order</p>
        <p className="mt-1 text-sm text-kse-ink">
          {instructions ?? "Use the arrows to arrange the steps from first to last."}
        </p>
        {prompt && <p className="mt-2 text-sm font-medium text-kse-navy">{prompt}</p>}
      </div>

      <div className="flex flex-col gap-2.5">
        {order.map((origIdx, pos) => {
          const itemOk = result?.perItem?.[pos];
          return (
            <div
              key={origIdx}
              className={clsx(
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition",
                result
                  ? itemOk
                    ? "border-kse-green bg-green-50"
                    : "border-red-300 bg-red-50"
                  : "border-kse-line bg-white",
              )}
            >
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  result && itemOk
                    ? "bg-kse-green text-white"
                    : result
                      ? "bg-red-400 text-white"
                      : "bg-kse-navy text-kse-yellow",
                )}
              >
                {pos + 1}
              </span>
              <span className="flex-1 text-sm text-kse-ink">{items[origIdx]}</span>
              {result ? (
                <span className="text-sm">{itemOk ? "✓" : "✗"}</span>
              ) : (
                <span className="flex flex-col gap-1">
                  <button
                    aria-label="Move up"
                    onClick={() => move(pos, -1)}
                    disabled={pos === 0}
                    className="rounded-md border border-kse-line px-2 py-0.5 text-xs text-kse-navy transition hover:bg-kse-navy-50 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    aria-label="Move down"
                    onClick={() => move(pos, 1)}
                    disabled={pos === order.length - 1}
                    className="rounded-md border border-kse-line px-2 py-0.5 text-xs text-kse-navy transition hover:bg-kse-navy-50 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!result ? (
        <button
          onClick={submit}
          disabled={busy || items.length === 0}
          className="self-start rounded-lg bg-kse-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-kse-navy-700 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Check my order"}
        </button>
      ) : (
        <div
          className={clsx(
            "rounded-xl border p-5",
            result.passed ? "border-kse-green bg-green-50" : "border-amber-300 bg-amber-50",
          )}
        >
          <p className="text-lg font-semibold text-kse-navy">
            {result.score}/{result.total} in place —{" "}
            {result.passed ? "Spot on! Next block unlocked. ✓" : `Need ${result.threshold} to pass.`}
          </p>
          {!result.passed && (
            <>
              <p className="mt-2 text-sm text-kse-ink">
                The ones marked ✗ are out of place. Reshuffle and try again.
              </p>
              <button
                onClick={retry}
                className="mt-3 rounded-lg bg-kse-navy px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
