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

interface Pair {
  left: string;
  right: string;
}
interface Result {
  score: number;
  total: number;
  passed: boolean;
  threshold: number;
  perItem?: boolean[];
}

/**
 * Matching exercise. The left column stays in original order. The right column
 * is shuffled for display. The student clicks a left card, then a right card,
 * to form a pairing (click again to clear).
 *
 * PROTOCOL (must match /api/quiz gradeAlternate):
 *   answers[i] = index into the ORIGINAL pairs[] array of the RIGHT option the
 *   student chose for left i. The grader treats answers[i] === i as correct.
 *   Because the right column is shuffled, we always resolve the displayed
 *   choice back to its original index before sending.
 */
export function MatchingExercise({
  itemId,
  instructions,
  pairs,
}: {
  itemId: string;
  instructions?: string;
  pairs: Pair[];
}) {
  const router = useRouter();

  // Shuffled display order of the rights: array of original pair indices.
  // Computed in a lazy initializer (and on retry) so Math.random is never
  // called during render.
  function shuffleRights() {
    const idx = pairs.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }
  const [rightOrder, setRightOrder] = useState<number[]>(() => shuffleRights());

  // assignment[leftIndex] = original pair index of the chosen right (or -1).
  const [assignment, setAssignment] = useState<number[]>(() => pairs.map(() => -1));
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const allMatched = assignment.every((a) => a >= 0);

  function pickLeft(i: number) {
    if (result) return;
    setActiveLeft((cur) => (cur === i ? null : i));
  }

  function pickRight(originalRightIdx: number) {
    if (result) return;
    if (activeLeft === null) return;
    setAssignment((prev) => {
      const next = [...prev];
      // Remove this right from any other left that holds it (1:1 matching).
      for (let k = 0; k < next.length; k++) {
        if (next[k] === originalRightIdx) next[k] = -1;
      }
      // Toggle off if the active left already had it.
      next[activeLeft] = next[activeLeft] === originalRightIdx ? -1 : originalRightIdx;
      return next;
    });
    setActiveLeft(null);
  }

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, answers: assignment }),
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
    setAssignment(pairs.map(() => -1));
    setActiveLeft(null);
    setResult(null);
    setRightOrder(shuffleRights());
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-kse-line bg-kse-navy-50 p-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-kse-navy">Match the pairs</p>
        <p className="mt-1 text-sm text-kse-ink">
          {instructions ??
            "Tap a term on the left, then tap its match on the right. Tap again to change your mind."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* LEFT column */}
        <div className="flex flex-col gap-2.5">
          {pairs.map((pair, i) => {
            const chosen = assignment[i];
            const matchedRight = chosen >= 0 ? pairs[chosen].right : null;
            const itemOk = result?.perItem?.[i];
            return (
              <button
                key={`l-${i}`}
                disabled={!!result}
                onClick={() => pickLeft(i)}
                className={clsx(
                  "rounded-xl border px-4 py-3 text-left text-sm transition",
                  result
                    ? itemOk
                      ? "border-kse-green bg-green-50"
                      : "border-red-300 bg-red-50"
                    : activeLeft === i
                      ? "border-kse-navy bg-kse-yellow-soft ring-2 ring-kse-yellow"
                      : chosen >= 0
                        ? "border-kse-navy bg-kse-navy-50"
                        : "border-kse-line hover:border-kse-navy/40",
                )}
              >
                <span className="font-medium text-kse-navy">{pair.left}</span>
                {matchedRight && (
                  <span className="mt-1 block text-xs text-kse-muted">
                    → {matchedRight}
                    {result && (itemOk ? " ✓" : " ✗")}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT column (shuffled) */}
        <div className="flex flex-col gap-2.5">
          {rightOrder.map((origIdx) => {
            const taken = assignment.includes(origIdx);
            return (
              <button
                key={`r-${origIdx}`}
                disabled={!!result || activeLeft === null}
                onClick={() => pickRight(origIdx)}
                className={clsx(
                  "rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed",
                  taken
                    ? "border-kse-navy/40 bg-kse-navy-50 text-kse-muted"
                    : activeLeft !== null && !result
                      ? "border-kse-navy/40 bg-white hover:border-kse-navy hover:bg-kse-yellow-soft"
                      : "border-kse-line bg-white",
                )}
              >
                {pairs[origIdx].right}
                {taken && <span className="ml-1 text-xs text-kse-muted">(paired)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {!result ? (
        <button
          onClick={submit}
          disabled={!allMatched || busy}
          className="self-start rounded-lg bg-kse-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-kse-navy-700 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Check my matches"}
        </button>
      ) : (
        <div
          className={clsx(
            "rounded-xl border p-5",
            result.passed ? "border-kse-green bg-green-50" : "border-amber-300 bg-amber-50",
          )}
        >
          <p className="text-lg font-semibold text-kse-navy">
            {result.score}/{result.total} matched —{" "}
            {result.passed ? "Nicely done! Next block unlocked. ✓" : `Need ${result.threshold} to pass.`}
          </p>
          {!result.passed && (
            <>
              <p className="mt-2 text-sm text-kse-ink">
                Close! Review the ones marked ✗ and give it another go.
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
