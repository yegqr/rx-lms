import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";
import { emptyContentFor } from "../_lib/content";

async function guard() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return session;
}

const itemTypeEnum = z.enum([
  "overview",
  "lesson",
  "reading",
  "quiz",
  "discussion",
  "assignment",
]);

const createSchema = z.object({
  moduleId: z.string().min(1),
  type: itemTypeEnum,
  title: z.string().min(1).max(200).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  duration: z.string().max(100).nullable().optional(),
  passThreshold: z.number().int().nonnegative().nullable().optional(),
  content: z.unknown().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

const reorderSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

/** Create an item appended at the end of a module, with empty content per type. */
export async function POST(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const module = await db.module.findUnique({
    where: { id: parsed.data.moduleId },
  });
  if (!module)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const last = await db.item.findFirst({
    where: { moduleId: module.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const created = await db.item.create({
    data: {
      moduleId: module.id,
      type: parsed.data.type,
      title: parsed.data.title ?? `New ${parsed.data.type}`,
      order,
      content: emptyContentFor(parsed.data.type) as Prisma.InputJsonValue,
      ...(parsed.data.type === "quiz" ? { passThreshold: 0 } : {}),
    },
  });

  await logActivity("admin.content.item_create", {
    userId: session.user.id,
    meta: { itemId: created.id, moduleId: module.id, type: created.type },
  });
  return NextResponse.json({ ok: true, item: created });
}

/** Update an item's title/duration/passThreshold/content. */
export async function PATCH(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await db.item.findUnique({ where: { id: parsed.data.id } });
  if (!existing)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const data: Prisma.ItemUpdateInput = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.duration !== undefined) data.duration = parsed.data.duration;
  if (parsed.data.passThreshold !== undefined)
    data.passThreshold = parsed.data.passThreshold;
  if (parsed.data.content !== undefined) {
    if (
      parsed.data.content === null ||
      typeof parsed.data.content !== "object" ||
      Array.isArray(parsed.data.content)
    ) {
      return NextResponse.json(
        { error: "content must be a JSON object" },
        { status: 400 },
      );
    }
    data.content = parsed.data.content as Prisma.InputJsonValue;
  }

  const updated = await db.item.update({
    where: { id: parsed.data.id },
    data,
  });

  await logActivity("admin.content.item_update", {
    userId: session.user.id,
    meta: { itemId: updated.id, type: updated.type },
  });
  return NextResponse.json({ ok: true, item: updated });
}

/** Delete an item. */
export async function DELETE(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await db.item.findUnique({ where: { id: parsed.data.id } });
  if (!existing)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  await db.item.delete({ where: { id: parsed.data.id } });

  await logActivity("admin.content.item_delete", {
    userId: session.user.id,
    meta: { itemId: parsed.data.id, moduleId: existing.moduleId },
  });
  return NextResponse.json({ ok: true });
}

/** Reorder an item by swapping `order` with its neighbor in the same module. */
export async function PUT(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const current = await db.item.findUnique({ where: { id: parsed.data.id } });
  if (!current)
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const neighbor = await db.item.findFirst({
    where: {
      moduleId: current.moduleId,
      order:
        parsed.data.direction === "up"
          ? { lt: current.order }
          : { gt: current.order },
    },
    orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return NextResponse.json({ ok: true, noop: true });

  await db.$transaction([
    db.item.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    }),
    db.item.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    }),
  ]);

  await logActivity("admin.content.item_reorder", {
    userId: session.user.id,
    meta: { itemId: current.id, direction: parsed.data.direction },
  });
  return NextResponse.json({ ok: true });
}
