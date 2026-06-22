import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const COURSE_SLUG = "disruption";

async function guard() {
  const session = await auth();
  if (session?.user?.role !== "admin") return null;
  return session;
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  myth: z.string().max(2000).optional(),
  isPreview: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(2000).nullable().optional(),
  myth: z.string().max(2000).nullable().optional(),
  isPreview: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

const reorderSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

/** Create a module appended at the end of the disruption course. */
export async function POST(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const course = await db.course.findUnique({ where: { slug: COURSE_SLUG } });
  if (!course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const last = await db.module.findFirst({
    where: { courseId: course.id },
    orderBy: { order: "desc" },
    select: { order: true, number: true },
  });
  const order = (last?.order ?? -1) + 1;
  const number = (last?.number ?? 0) + 1;

  const created = await db.module.create({
    data: {
      courseId: course.id,
      title: parsed.data.title,
      summary: parsed.data.summary ?? null,
      myth: parsed.data.myth ?? null,
      isPreview: parsed.data.isPreview ?? false,
      order,
      number,
    },
  });

  await logActivity("admin.content.module_create", {
    userId: session.user.id,
    meta: { moduleId: created.id, title: created.title },
  });
  return NextResponse.json({ ok: true, module: created });
}

/** Update module fields. */
export async function PATCH(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id, ...rest } = parsed.data;
  const existing = await db.module.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const updated = await db.module.update({
    where: { id },
    data: {
      ...(rest.title !== undefined ? { title: rest.title } : {}),
      ...(rest.summary !== undefined ? { summary: rest.summary } : {}),
      ...(rest.myth !== undefined ? { myth: rest.myth } : {}),
      ...(rest.isPreview !== undefined ? { isPreview: rest.isPreview } : {}),
    },
  });

  await logActivity("admin.content.module_update", {
    userId: session.user.id,
    meta: { moduleId: id },
  });
  return NextResponse.json({ ok: true, module: updated });
}

/** Delete a module (cascades to its items). */
export async function DELETE(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await db.module.findUnique({ where: { id: parsed.data.id } });
  if (!existing)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  await db.module.delete({ where: { id: parsed.data.id } });

  await logActivity("admin.content.module_delete", {
    userId: session.user.id,
    meta: { moduleId: parsed.data.id, title: existing.title },
  });
  return NextResponse.json({ ok: true });
}

/** Reorder a module by swapping `order` (and `number`) with its neighbor. */
export async function PUT(req: Request) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const current = await db.module.findUnique({ where: { id: parsed.data.id } });
  if (!current)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const neighbor = await db.module.findFirst({
    where: {
      courseId: current.courseId,
      order:
        parsed.data.direction === "up"
          ? { lt: current.order }
          : { gt: current.order },
    },
    orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return NextResponse.json({ ok: true, noop: true });

  // Swap order + number. number has a unique constraint with courseId, so use a
  // temporary value to avoid a collision mid-swap.
  await db.$transaction([
    db.module.update({
      where: { id: current.id },
      data: { number: -1 },
    }),
    db.module.update({
      where: { id: neighbor.id },
      data: { order: current.order, number: current.number },
    }),
    db.module.update({
      where: { id: current.id },
      data: { order: neighbor.order, number: neighbor.number },
    }),
  ]);

  await logActivity("admin.content.module_reorder", {
    userId: session.user.id,
    meta: { moduleId: current.id, direction: parsed.data.direction },
  });
  return NextResponse.json({ ok: true });
}
