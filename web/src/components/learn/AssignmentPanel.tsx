"use client";

import { useState } from "react";
import confetti from "canvas-confetti";

interface Grade {
  score: number;
  summary: string;
  criteria: { dimension: string; comment: string }[];
}

interface RubricRow {
  dimension?: string;
  weight?: string;
  descriptor?: string;
  [k: string]: unknown;
}

export function AssignmentPanel({
  itemId,
  brief,
  rubric,
  dueDate,
  initialText,
}: {
  itemId: string;
  brief: string;
  rubric?: RubricRow[] | string[][];
  dueDate?: string;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [saved, setSaved] = useState(!!initialText);
  const [busy, setBusy] = useState(false);
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [gradeErr, setGradeErr] = useState("");

  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await fetch("/api/submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, text: body }),
    });
    const data = await res.json();
    setSaved(!!data.ok);
    setBusy(false);
  }

  async function assess() {
    if (grading) return;
    if (!saved) await submit();
    setGrading(true);
    setGradeErr("");
    setGrade(null);
    const res = await fetch("/api/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    setGrading(false);
    if (!res.ok) {
      setGradeErr(data.error ?? "Grading failed.");
      return;
    }
    setGrade(data.grade);
    if (data.grade?.score >= 6) {
      const colors = ["#003863", "#f1e935", "#a7c539"];
      confetti({ particleCount: 130, spread: 80, origin: { y: 0.6 }, colors });
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-kse-line bg-white p-5 text-sm leading-relaxed text-kse-ink">
        <p>{brief}</p>
        {dueDate && <p className="mt-2 text-kse-muted">Due: {dueDate}</p>}
      </div>

      {Array.isArray(rubric) && rubric.length > 0 && (
        <div className="mt-4 rounded-xl border border-kse-line bg-white p-5">
          <p className="mb-2 text-sm font-semibold text-kse-navy">Rubric</p>
          <ul className="space-y-1.5 text-sm text-kse-ink">
            {rubric.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-kse-yellow">◆</span>
                <span>
                  {Array.isArray(r)
                    ? r.filter(Boolean).join(" — ")
                    : [r.dimension, r.weight, r.descriptor].filter(Boolean).join(" — ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          rows={12}
          placeholder="Write your essay here (cohesive paragraphs, no bullet points)…"
          className="w-full resize-y rounded-lg border border-kse-line p-4 text-sm leading-relaxed outline-none focus:border-kse-navy"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="rounded-lg border border-kse-navy px-5 py-2.5 text-sm font-semibold text-kse-navy disabled:opacity-40"
          >
            {busy ? "Submitting…" : saved ? "Resubmit" : "Submit"}
          </button>
          <button
            onClick={assess}
            disabled={grading || !text.trim()}
            className="rounded-lg bg-kse-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-kse-navy-700"
          >
            {grading ? "Bradd is reading…" : "Get instant AI feedback ✨"}
          </button>
          {saved && !grade && <span className="text-sm text-kse-green">✓ Submitted</span>}
        </div>
        {gradeErr && <p className="mt-2 text-sm text-red-600">{gradeErr}</p>}
      </div>

      {grade && (
        <div className="mt-5 rounded-xl border border-kse-line bg-white p-5">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold ${
                grade.score >= 6 ? "bg-green-50 text-kse-green" : "bg-amber-50 text-amber-600"
              }`}
            >
              {grade.score}/10
            </span>
            <p className="text-sm leading-relaxed text-kse-ink">{grade.summary}</p>
          </div>
          {grade.criteria.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-kse-line pt-4">
              {grade.criteria.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold text-kse-navy">{c.dimension}: </span>
                  <span className="text-kse-ink">{c.comment}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-kse-muted">Graded by Bradd (AI) · you can revise and re-grade.</p>
        </div>
      )}
    </div>
  );
}
