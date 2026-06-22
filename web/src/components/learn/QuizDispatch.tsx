"use client";

import { QuizRunner } from "./QuizRunner";
import { MatchingExercise } from "./exercises/MatchingExercise";
import { OrderingExercise } from "./exercises/OrderingExercise";

/**
 * Local re-declaration of the content shapes (the contract lives in
 * src/lib/content-types.ts; we don't edit it). `format` discriminates which
 * renderer to use. The DB item.type stays "quiz" for all of these.
 */
interface McqQuestion {
  q: string;
  options: string[];
  correct: number;
  feedback?: string;
}
interface QuizDispatchContent {
  format?: "mcq" | "matching" | "ordering";
  // mcq
  questions?: McqQuestion[];
  retutorial?: string;
  // matching
  instructions?: string;
  pairs?: { left: string; right: string }[];
  // ordering
  prompt?: string;
  items?: string[];
  passThreshold?: number;
}

export function QuizDispatch({
  itemId,
  content,
}: {
  itemId: string;
  content: QuizDispatchContent;
}) {
  const format = content?.format ?? "mcq";

  if (format === "matching") {
    return (
      <MatchingExercise
        itemId={itemId}
        instructions={content.instructions}
        pairs={content.pairs ?? []}
      />
    );
  }

  if (format === "ordering") {
    return (
      <OrderingExercise
        itemId={itemId}
        instructions={content.instructions}
        prompt={content.prompt}
        items={content.items ?? []}
      />
    );
  }

  // Default: existing standard multiple-choice quiz.
  return (
    <QuizRunner
      itemId={itemId}
      questions={content.questions ?? []}
      retutorial={content.retutorial}
    />
  );
}
