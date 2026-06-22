"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import confetti from "canvas-confetti";

function celebrate() {
  const colors = ["#003863", "#f1e935", "#a7c539"];
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors }), 150);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors }), 150);
}

interface Question {
  q: string;
  options: string[];
  correct: number;
  feedback?: string;
}
interface Feedback {
  q: string;
  correct: number;
  chosen: number;
  isCorrect: boolean;
  feedback?: string;
  options: string[];
}
interface Result {
  score: number;
  total: number;
  passed: boolean;
  threshold: number;
  feedback: Feedback[];
}

export function QuizRunner({
  itemId,
  questions,
  retutorial,
}: {
  itemId: string;
  questions: Question[];
  retutorial?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const allAnswered = answers.every((a) => a >= 0);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, answers }),
    });
    const data = (await res.json()) as Result;
    setResult(data);
    setBusy(false);
    if (data.passed) {
      celebrate();
      router.refresh();
    }
  }

  function retake() {
    setAnswers(questions.map(() => -1));
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {questions.map((question, qi) => {
        const fb = result?.feedback[qi];
        return (
          <div key={qi} className="rounded-xl border border-kse-line bg-white p-5">
            <p className="font-medium text-kse-navy">
              {qi + 1}. {question.q}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {question.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const showCorrect = result && oi === question.correct;
                const showWrong = result && fb && oi === fb.chosen && !fb.isCorrect;
                return (
                  <button
                    key={oi}
                    disabled={!!result}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    className={clsx(
                      "rounded-lg border px-3.5 py-2.5 text-left text-sm transition",
                      showCorrect
                        ? "border-kse-green bg-green-50 text-kse-ink"
                        : showWrong
                          ? "border-red-300 bg-red-50 text-kse-ink"
                          : chosen
                            ? "border-kse-navy bg-kse-navy-50"
                            : "border-kse-line hover:border-kse-navy/40",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {fb && (
              <p
                className={clsx(
                  "mt-2.5 text-sm",
                  fb.isCorrect ? "text-kse-green" : "text-red-600",
                )}
              >
                {fb.feedback}
              </p>
            )}
          </div>
        );
      })}

      {!result ? (
        <button
          onClick={submit}
          disabled={!allAnswered || busy}
          className="self-start rounded-lg bg-kse-navy px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 hover:bg-kse-navy-700"
        >
          {busy ? "Checking…" : "Submit answers"}
        </button>
      ) : (
        <div
          className={clsx(
            "rounded-xl border p-5",
            result.passed ? "border-kse-green bg-green-50" : "border-amber-300 bg-amber-50",
          )}
        >
          <p className="text-lg font-semibold text-kse-navy">
            {result.score}/{result.total} —{" "}
            {result.passed ? "Passed ✓ Next block unlocked." : `Need ${result.threshold} to pass.`}
          </p>
          {!result.passed && retutorial && (
            <p className="mt-2 text-sm text-kse-ink">{retutorial}</p>
          )}
          {!result.passed && (
            <button
              onClick={retake}
              className="mt-3 rounded-lg bg-kse-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Retake
            </button>
          )}
        </div>
      )}
    </div>
  );
}
