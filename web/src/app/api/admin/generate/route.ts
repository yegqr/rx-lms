import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/logger";
import { generateExercise } from "@/lib/ai/generate";

export const maxDuration = 140;

const schema = z.object({
  moduleId: z.string().min(1).optional(),
  topic: z.string().optional(),
  kind: z.enum(["mcq", "matching", "ordering"]),
});

/** Pull plain text out of an Item.content JSON payload (body/brief/prompt/questions). */
function textFromContent(content: unknown): string {
  if (typeof content !== "object" || content === null) return "";
  const c = content as Record<string, unknown>;
  const chunks: string[] = [];
  for (const key of ["body", "brief", "prompt"]) {
    if (typeof c[key] === "string") chunks.push(c[key] as string);
  }
  if (Array.isArray(c.questions)) {
    for (const q of c.questions) {
      if (q && typeof q === "object" && typeof (q as Record<string, unknown>).q === "string") {
        chunks.push((q as Record<string, unknown>).q as string);
      }
    }
  }
  return chunks.join("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { moduleId, kind } = parsed.data;

  let topic = parsed.data.topic?.trim() ?? "";
  let context = "";

  if (moduleId) {
    const mod = await db.module.findUnique({
      where: { id: moduleId },
      include: { items: { orderBy: { order: "asc" } } },
    });
    if (!mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    if (!topic) {
      topic = [mod.title, mod.myth].filter(Boolean).join(" — ");
    }
    const raw = [mod.summary ?? "", mod.myth ?? "", ...mod.items.map((i) => textFromContent(i.content))]
      .filter(Boolean)
      .join("\n\n");
    context = stripHtml(raw).slice(0, 3000);
  }

  if (!topic && !context) {
    return NextResponse.json(
      { error: "Provide a topic or a moduleId to generate from." },
      { status: 400 },
    );
  }

  const content = await generateExercise({ topic, context, kind });

  await logActivity("admin.ai_generate", {
    userId: session.user.id,
    meta: { moduleId: moduleId ?? null, kind, topic, ok: content !== null },
  });

  if (!content) {
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ content });
}
