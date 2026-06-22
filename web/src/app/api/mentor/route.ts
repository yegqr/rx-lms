import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";
import { mentorReply, type MentorTurn } from "@/lib/ai/mentor";
import { stripHtml } from "@/lib/course";

export const maxDuration = 140; // the Claude CLI call can take a while

const schema = z.object({
  itemId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

const FALLBACK =
  "I can't reach the mentor service right now — give it another try in a moment. In the meantime: what's the specific claim or example on this page you'd like to pressure-test?";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { itemId, messages } = parsed.data;
  const userId = session.user.id;

  const item = await db.item.findUnique({
    where: { id: itemId },
    include: { module: { include: { course: true } } },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const content = item.content as Record<string, unknown>;
  const rawText =
    (content?.body as string) ??
    (content?.prompt as string) ??
    (content?.brief as string) ??
    (Array.isArray(content?.questions)
      ? (content.questions as Array<{ q: string }>).map((q) => q.q).join(" · ")
      : "");
  const excerpt = stripHtml(rawText);
  const best = await db.quizAttempt.findFirst({
    where: { userId, item: { moduleId: item.moduleId, type: "quiz" } },
    orderBy: { score: "desc" },
  });

  const result = await mentorReply(messages as MentorTurn[], {
    courseTitle: item.module.course.title,
    moduleTitle: item.module.title,
    itemTitle: item.title,
    itemType: item.type,
    pageExcerpt: excerpt,
    quizScore: best ? { score: best.score, total: best.total } : null,
    studentName: session.user.name ?? undefined,
  });

  const reply = result.source === "claude-cli" && result.text ? result.text : FALLBACK;

  // Persist / append the session thread for this item.
  const existing = await db.mentorSession.findFirst({ where: { userId, itemId } });
  const thread = [...messages, { role: "assistant", content: reply, ts: Date.now() }];
  if (existing) {
    await db.mentorSession.update({ where: { id: existing.id }, data: { messages: thread } });
  } else {
    await db.mentorSession.create({ data: { userId, itemId, messages: thread } });
  }

  await logActivity("mentor.reply", { userId, meta: { itemId, source: result.source } });

  return NextResponse.json({ reply, source: result.source });
}
