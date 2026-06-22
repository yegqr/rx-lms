import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";
import type { QuizContent, QuizQuestion } from "@/lib/content-types";

const schema = z.object({
  itemId: z.string().min(1),
  answers: z.array(z.number().int()),
});

export interface QuizFeedback {
  q: string;
  correct: number;
  chosen: number;
  isCorrect: boolean;
  feedback?: string;
  options: string[];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { itemId, answers } = parsed.data;
  const userId = session.user.id;

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "quiz") {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // ── Discriminate on content.format. Default (undefined/"mcq") = standard MCQ.
  // matching / ordering are alternative exercise formats stored on the same
  // "quiz" item type. See protocol docs below each branch.
  const rawContent = item.content as Record<string, unknown> | null;
  const format = (rawContent?.format as string | undefined) ?? "mcq";

  if (format === "matching" || format === "ordering") {
    return gradeAlternate(format, item, rawContent, answers, userId, itemId);
  }

  const content = item.content as unknown as QuizContent;
  const questions: QuizQuestion[] = content?.questions ?? [];
  const total = questions.length;

  let score = 0;
  const feedback: QuizFeedback[] = questions.map((question, i) => {
    const chosen = answers[i] ?? -1;
    const isCorrect = chosen === question.correct;
    if (isCorrect) score += 1;
    return {
      q: question.q,
      correct: question.correct,
      chosen,
      isCorrect,
      feedback: question.feedback,
      options: question.options,
    };
  });

  // passThreshold: item-level wins, then content-level, else 60% of total.
  const threshold =
    item.passThreshold ??
    content?.passThreshold ??
    Math.ceil(total * 0.6);
  const passed = total > 0 && score >= threshold;

  await db.quizAttempt.create({
    data: { userId, itemId, score, total, answers },
  });

  if (passed) {
    await db.progress.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });
  }

  await logActivity("quiz.attempt", {
    userId,
    meta: { itemId, score, total, passed },
  });

  return NextResponse.json({ score, total, passed, threshold, feedback });
}

/**
 * Grading for the alternate exercise formats ("matching" / "ordering").
 * type stays "quiz" in the DB; we still create a QuizAttempt and upsert
 * Progress on pass. Returns { score, total, passed, threshold, perItem }.
 *
 * ── ANSWERS PROTOCOL (client must match exactly) ────────────────────────────
 *
 * MATCHING — content = { format:"matching", pairs:[{left,right}], passThreshold? }
 *   The CORRECT mapping is the identity: pairs[i].right is the true match for
 *   pairs[i].left. The client may shuffle the right-hand options for display,
 *   but it MUST resolve its choice back to the index in the ORIGINAL pairs[]
 *   array before sending. So:
 *     answers[i] = index into content.pairs of the RIGHT option the student
 *                  chose for the i-th left item.
 *   A left i is correct  ⇔  answers[i] === i.   total = pairs.length.
 *
 * ORDERING — content = { format:"ordering", items:[string,...] }
 *   content.items is stored in the CORRECT order. The client presents them
 *   (shuffled) and lets the student reorder. It sends:
 *     answers[p] = index into content.items of the item the student placed at
 *                  position p.
 *   Position p is correct  ⇔  answers[p] === p.   total = items.length.
 *
 * Both: passThreshold = item-level ?? content-level ?? ceil(0.6 * total).
 */
async function gradeAlternate(
  format: "matching" | "ordering",
  item: { id: string; passThreshold: number | null },
  rawContent: Record<string, unknown> | null,
  answers: number[],
  userId: string,
  itemId: string,
) {
  let total = 0;
  if (format === "matching") {
    const pairs = (rawContent?.pairs as unknown[] | undefined) ?? [];
    total = pairs.length;
  } else {
    const items = (rawContent?.items as unknown[] | undefined) ?? [];
    total = items.length;
  }

  // For both formats the rule is identical: position i is correct iff
  // answers[i] === i (see protocol above).
  let score = 0;
  const perItem: boolean[] = [];
  for (let i = 0; i < total; i++) {
    const ok = answers[i] === i;
    perItem.push(ok);
    if (ok) score += 1;
  }

  const threshold =
    item.passThreshold ??
    (rawContent?.passThreshold as number | undefined) ??
    Math.ceil(total * 0.6);
  const passed = total > 0 && score >= threshold;

  await db.quizAttempt.create({
    data: { userId, itemId, score, total, answers },
  });

  if (passed) {
    await db.progress.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() },
    });
  }

  await logActivity("quiz.attempt", {
    userId,
    meta: { itemId, score, total, passed, format },
  });

  return NextResponse.json({ score, total, passed, threshold, perItem });
}
