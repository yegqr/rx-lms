import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(["student", "instructor", "admin"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { userId, role } = parsed.data;
  await db.user.update({ where: { id: userId }, data: { role } });
  await logActivity("admin.role_change", {
    userId: session.user.id,
    meta: { targetUser: userId, role },
  });
  return NextResponse.json({ ok: true });
}
