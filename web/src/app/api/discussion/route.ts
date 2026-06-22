import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const schema = z.object({
  itemId: z.string().min(1),
  body: z.string().min(1).max(10_000),
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

  const { itemId, body } = parsed.data;
  const userId = session.user.id;

  const item = await db.item.findUnique({ where: { id: itemId } });
  if (!item || item.type !== "discussion") {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  const post = await db.discussionPost.create({
    data: { userId, itemId, body },
    include: { user: { select: { name: true, email: true } } },
  });

  // Participating marks the discussion item complete.
  await db.progress.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });

  await logActivity("discussion.post", { userId, meta: { itemId, postId: post.id } });

  return NextResponse.json({
    ok: true,
    post: {
      id: post.id,
      body: post.body,
      createdAt: post.createdAt.toISOString(),
      authorName: post.user?.name ?? post.user?.email ?? "You",
    },
  });
}
