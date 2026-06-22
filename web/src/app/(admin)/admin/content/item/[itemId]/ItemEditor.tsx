"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ItemType } from "@/lib/content-types";

type ItemData = {
  id: string;
  type: ItemType;
  title: string;
  duration: string | null;
  passThreshold: number | null;
  moduleId: string;
  content: Record<string, unknown>;
};

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
  feedback: string;
};

type RubricRow = { dimension: string; weight: number | ""; descriptor: string };

const STRUCTURED: ItemType[] = [
  "lesson",
  "reading",
  "overview",
  "quiz",
  "discussion",
  "assignment",
];

export function ItemEditor({ item }: { item: ItemData }) {
  const router = useRouter();

  const [title, setTitle] = useState(item.title);
  const [duration, setDuration] = useState(item.duration ?? "");
  const [passThreshold, setPassThreshold] = useState<string>(
    item.passThreshold != null ? String(item.passThreshold) : "",
  );

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // structured editors share `content` state through dedicated hooks below
  const structured = STRUCTURED.includes(item.type);

  // --- body-based (lesson/reading/overview) ---
  const [body, setBody] = useState<string>(
    typeof item.content.body === "string" ? (item.content.body as string) : "",
  );
  const [videoUrl, setVideoUrl] = useState<string>(
    typeof item.content.videoUrl === "string"
      ? (item.content.videoUrl as string)
      : "",
  );

  // --- discussion ---
  const [prompt, setPrompt] = useState<string>(
    typeof item.content.prompt === "string"
      ? (item.content.prompt as string)
      : "",
  );

  // --- assignment ---
  const [brief, setBrief] = useState<string>(
    typeof item.content.brief === "string" ? (item.content.brief as string) : "",
  );
  const [rubric, setRubric] = useState<RubricRow[]>(() => {
    const r = item.content.rubric;
    if (Array.isArray(r)) {
      return (r as Record<string, unknown>[]).map((row) => ({
        dimension: typeof row.dimension === "string" ? row.dimension : "",
        weight: typeof row.weight === "number" ? row.weight : "",
        descriptor: typeof row.descriptor === "string" ? row.descriptor : "",
      }));
    }
    return [];
  });

  // --- quiz ---
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    const qs = item.content.questions;
    if (Array.isArray(qs)) {
      return (qs as Record<string, unknown>[]).map((q) => ({
        q: typeof q.q === "string" ? q.q : "",
        options: Array.isArray(q.options)
          ? (q.options as unknown[]).map((o) => String(o))
          : ["", ""],
        correct: typeof q.correct === "number" ? q.correct : 0,
        feedback: typeof q.feedback === "string" ? q.feedback : "",
      }));
    }
    return [];
  });
  const [aiBusy, setAiBusy] = useState(false);

  // --- raw JSON fallback ---
  const [rawJson, setRawJson] = useState<string>(
    JSON.stringify(item.content, null, 2),
  );

  function buildContent(): Record<string, unknown> | { __error: string } {
    switch (item.type) {
      case "lesson":
      case "reading":
      case "overview": {
        const c: Record<string, unknown> = { body };
        if (videoUrl.trim()) c.videoUrl = videoUrl.trim();
        return c;
      }
      case "discussion":
        return { prompt };
      case "assignment":
        return {
          brief,
          rubric: rubric
            .filter((r) => r.dimension.trim())
            .map((r) => ({
              dimension: r.dimension.trim(),
              ...(r.weight !== "" ? { weight: Number(r.weight) } : {}),
              ...(r.descriptor.trim() ? { descriptor: r.descriptor.trim() } : {}),
            })),
        };
      case "quiz": {
        const content: Record<string, unknown> = {
          questions: questions.map((q) => ({
            q: q.q,
            options: q.options,
            correct: q.correct,
            ...(q.feedback.trim() ? { feedback: q.feedback } : {}),
          })),
        };
        if (passThreshold.trim() !== "")
          content.passThreshold = Number(passThreshold);
        return content;
      }
      default: {
        try {
          const parsed = JSON.parse(rawJson);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
            return { __error: "JSON must be an object" };
          return parsed as Record<string, unknown>;
        } catch {
          return { __error: "Invalid JSON" };
        }
      }
    }
  }

  async function save() {
    const built = buildContent();
    const builtErr = (built as { __error?: string }).__error;
    if (typeof builtErr === "string") {
      setMsg(builtErr);
      return;
    }
    const content = built as Record<string, unknown>;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/content/item", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        title: title.trim(),
        duration: duration.trim() || null,
        passThreshold: passThreshold.trim() === "" ? null : Number(passThreshold),
        content,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved");
      router.refresh();
    } else {
      setMsg("Save failed");
    }
  }

  async function generateQuiz() {
    setAiBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: item.moduleId, kind: "mcq" }),
      });
      if (res.status === 404) {
        setMsg("AI generator not ready yet");
        return;
      }
      if (!res.ok) {
        setMsg("AI generation failed");
        return;
      }
      const data = await res.json();
      const qs = data?.content?.questions;
      if (Array.isArray(qs)) {
        setQuestions(
          qs.map((q: Record<string, unknown>) => ({
            q: typeof q.q === "string" ? q.q : "",
            options: Array.isArray(q.options)
              ? (q.options as unknown[]).map((o) => String(o))
              : ["", ""],
            correct: typeof q.correct === "number" ? q.correct : 0,
            feedback: typeof q.feedback === "string" ? q.feedback : "",
          })),
        );
        setMsg("Questions generated — review and save");
      } else {
        setMsg("AI returned no questions");
      }
    } catch {
      setMsg("AI generator not ready yet");
    } finally {
      setAiBusy(false);
    }
  }

  // ---- quiz helpers ----
  function addQuestion() {
    setQuestions((q) => [
      ...q,
      { q: "", options: ["", ""], correct: 0, feedback: "" },
    ]);
  }
  function updateQuestion(i: number, patch: Partial<QuizQuestion>) {
    setQuestions((q) => q.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeQuestion(i: number) {
    setQuestions((q) => q.filter((_, idx) => idx !== i));
  }
  function addOption(qi: number) {
    setQuestions((q) =>
      q.map((it, idx) =>
        idx === qi && it.options.length < 6
          ? { ...it, options: [...it.options, ""] }
          : it,
      ),
    );
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions((q) =>
      q.map((it, idx) =>
        idx === qi
          ? { ...it, options: it.options.map((o, j) => (j === oi ? value : o)) }
          : it,
      ),
    );
  }
  function removeOption(qi: number, oi: number) {
    setQuestions((q) =>
      q.map((it, idx) => {
        if (idx !== qi || it.options.length <= 2) return it;
        const options = it.options.filter((_, j) => j !== oi);
        let correct = it.correct;
        if (oi === it.correct) correct = 0;
        else if (oi < it.correct) correct -= 1;
        return { ...it, options, correct };
      }),
    );
  }

  // ---- rubric helpers ----
  function addRubricRow() {
    setRubric((r) => [...r, { dimension: "", weight: "", descriptor: "" }]);
  }
  function updateRubricRow(i: number, patch: Partial<RubricRow>) {
    setRubric((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRubricRow(i: number) {
    setRubric((r) => r.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-6">
      {/* Common fields */}
      <div className="rounded-xl border border-kse-line bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" className="sm:col-span-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
            />
          </Field>
          <Field label="Duration (e.g. 12 min)">
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
            />
          </Field>
          <Field label="Pass threshold">
            <input
              type="number"
              min={0}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
              placeholder={item.type === "quiz" ? "e.g. 6" : "—"}
              className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
            />
          </Field>
        </div>
      </div>

      {/* Type-specific content */}
      <div className="rounded-xl border border-kse-line bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-kse-navy">Content</h2>

        {(item.type === "lesson" ||
          item.type === "reading" ||
          item.type === "overview") && (
          <div className="space-y-4">
            <Field label="Body (HTML)">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-kse-line bg-white px-3 py-2 font-mono text-xs outline-none focus:border-kse-navy"
              />
            </Field>
            <Field label="Video URL (optional)">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
              />
            </Field>
          </div>
        )}

        {item.type === "discussion" && (
          <Field label="Prompt">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
            />
          </Field>
        )}

        {item.type === "assignment" && (
          <div className="space-y-5">
            <Field label="Brief (HTML)">
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-kse-line bg-white px-3 py-2 font-mono text-xs outline-none focus:border-kse-navy"
              />
            </Field>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-kse-muted">
                  Rubric
                </span>
                <button
                  type="button"
                  onClick={addRubricRow}
                  className="rounded-md border border-kse-line px-2 py-1 text-xs font-medium text-kse-navy hover:bg-kse-navy-50"
                >
                  ＋ Add row
                </button>
              </div>
              <div className="space-y-2">
                {rubric.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-kse-line p-2"
                  >
                    <input
                      value={row.dimension}
                      onChange={(e) =>
                        updateRubricRow(i, { dimension: e.target.value })
                      }
                      placeholder="Dimension"
                      className="col-span-3 rounded-md border border-kse-line px-2 py-1 text-sm outline-none focus:border-kse-navy"
                    />
                    <input
                      type="number"
                      value={row.weight}
                      onChange={(e) =>
                        updateRubricRow(i, {
                          weight: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="Weight"
                      className="col-span-2 rounded-md border border-kse-line px-2 py-1 text-sm outline-none focus:border-kse-navy"
                    />
                    <input
                      value={row.descriptor}
                      onChange={(e) =>
                        updateRubricRow(i, { descriptor: e.target.value })
                      }
                      placeholder="Descriptor"
                      className="col-span-6 rounded-md border border-kse-line px-2 py-1 text-sm outline-none focus:border-kse-navy"
                    />
                    <button
                      type="button"
                      onClick={() => removeRubricRow(i)}
                      className="col-span-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {rubric.length === 0 ? (
                  <p className="text-xs text-kse-muted">No rubric rows.</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {item.type === "quiz" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-kse-muted">
                Questions · {questions.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={generateQuiz}
                  className="rounded-md border border-kse-line bg-kse-yellow-soft px-3 py-1.5 text-xs font-medium text-kse-ink hover:brightness-95 disabled:opacity-50"
                >
                  {aiBusy ? "Generating…" : "✨ Generate with AI"}
                </button>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="rounded-md border border-kse-line px-3 py-1.5 text-xs font-medium text-kse-navy hover:bg-kse-navy-50"
                >
                  ＋ Add question
                </button>
              </div>
            </div>

            {questions.map((q, qi) => (
              <div
                key={qi}
                className="rounded-lg border border-kse-line p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-kse-navy">
                    Q{qi + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qi)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={q.q}
                  onChange={(e) => updateQuestion(qi, { q: e.target.value })}
                  placeholder="Question text"
                  rows={2}
                  className="mb-3 w-full rounded-md border border-kse-line px-3 py-2 text-sm outline-none focus:border-kse-navy"
                />
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correct === oi}
                        onChange={() => updateQuestion(qi, { correct: oi })}
                        title="Mark correct"
                        className="h-4 w-4"
                      />
                      <input
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 rounded-md border border-kse-line px-2 py-1 text-sm outline-none focus:border-kse-navy"
                      />
                      <button
                        type="button"
                        disabled={q.options.length <= 2}
                        onClick={() => removeOption(qi, oi)}
                        className="rounded-md border border-kse-line px-2 py-1 text-xs text-kse-muted hover:bg-kse-navy-50 disabled:opacity-30"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {q.options.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => addOption(qi)}
                    className="mt-2 text-xs font-medium text-kse-navy hover:underline"
                  >
                    ＋ Add option
                  </button>
                ) : null}
                <Field label="Feedback (shown after answering)" className="mt-3">
                  <textarea
                    value={q.feedback}
                    onChange={(e) =>
                      updateQuestion(qi, { feedback: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-md border border-kse-line px-3 py-2 text-sm outline-none focus:border-kse-navy"
                  />
                </Field>
              </div>
            ))}
            {questions.length === 0 ? (
              <p className="text-xs text-kse-muted">
                No questions yet. Add one or generate with AI.
              </p>
            ) : null}
            <p className="text-xs text-kse-muted">
              Pass threshold above is saved into the quiz content (out of{" "}
              {questions.length} questions).
            </p>
          </div>
        )}

        {!structured && (
          <Field label="Raw content (JSON)">
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-kse-line bg-white px-3 py-2 font-mono text-xs outline-none focus:border-kse-navy"
            />
          </Field>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-lg bg-kse-navy px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save item"}
        </button>
        {msg ? <span className="text-sm text-kse-muted">{msg}</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-kse-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
