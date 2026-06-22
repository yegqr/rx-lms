import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";
import { gradeEssay } from "@/lib/ai/grade";

export const maxDuration = 140;

const schema = z.object({ itemId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const userId = session.user.id;
  const { itemId } = parsed.data;

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "assignment") {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
  const submission = await db.submission.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!submission?.text) {
    return NextResponse.json({ error: "Submit your essay first." }, { status: 400 });
  }

  const content = item.content as Record<string, unknown>;
  const grade = await gradeEssay({
    brief: (content.brief as string) ?? (content.body as string) ?? "",
    rubric: content.rubric,
    essay: submission.text,
  });

  if (!grade) {
    return NextResponse.json({ error: "The grader is busy — try again in a moment." }, { status: 503 });
  }

  await db.grade.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      graderId: null,
      scores: grade.criteria,
      feedback: grade.summary,
      total: grade.score,
    },
    update: { scores: grade.criteria, feedback: grade.summary, total: grade.score },
  });
  await db.submission.update({ where: { id: submission.id }, data: { status: "graded" } });
  await logActivity("assignment.ai_graded", { userId, meta: { itemId, score: grade.score } });

  return NextResponse.json({ grade });
}
