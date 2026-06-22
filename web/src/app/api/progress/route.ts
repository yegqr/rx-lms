import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const schema = z.object({
  itemId: z.string().min(1),
  completed: z.boolean(),
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

  const { itemId, completed } = parsed.data;
  const userId = session.user.id;

  // Ensure the item exists (and is reachable) before recording progress.
  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const progress = await db.progress.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, completed, completedAt: completed ? new Date() : null },
    update: { completed, completedAt: completed ? new Date() : null },
  });

  await logActivity("progress.update", {
    userId,
    meta: { itemId, completed },
  });

  return NextResponse.json({ ok: true, progress });
}
