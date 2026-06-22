import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const schema = z.object({
  itemId: z.string().min(1),
  text: z.string().min(1).max(50_000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { itemId, text } = parsed.data;
  const userId = session.user.id;

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "assignment") {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const submission = await db.submission.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, text, status: "submitted" },
    update: { text, status: "submitted", submittedAt: new Date() },
  });

  // Submitting an assignment marks the item complete.
  await db.progress.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

  await logActivity("submission.create", { userId, meta: { itemId } });

  return NextResponse.json({ ok: true, submission });
}
