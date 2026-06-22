import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid details (password ≥ 8 chars)." }, { status: 400 });
  }
  const name = parsed.data.name.trim();
  const email = parsed.data.email.toLowerCase().trim();

  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
  if (domain && !email.endsWith(`@${domain}`)) {
    return NextResponse.json({ error: `Registration is limited to @${domain} emails.` }, { status: 403 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: { name, email, passwordHash, role: "student" },
  });

  await logActivity("auth.register", { userId: user.id, meta: { email } });
  return NextResponse.json({ ok: true });
}
