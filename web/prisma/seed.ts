/**
 * Seed the Disruption course from the extracted demo data
 * (content/disruption-data.json, produced once from the original RethinkX demo).
 * Idempotent. Run: npx tsx prisma/seed.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, ItemType } from "@prisma/client";

const db = new PrismaClient();

const DATA = path.resolve(__dirname, "../content/disruption-data.json");

interface DemoItem { id: string; type: string; title: string; duration?: string }
interface DemoModule { id: string; title: string; summary?: string; items: DemoItem[] }
interface DemoPreview {
  num: number; weeks?: string; title: string; myth?: string; summary?: string;
  core?: string[]; items?: string[]; summative?: string;
}
interface DemoCourse {
  title: string; subtitle?: string; cohort?: string;
  modules: DemoModule[]; previewModules?: DemoPreview[];
}

function escapeText(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mentorBody(c: any): string {
  let body = c?.body ?? "";
  if (Array.isArray(c?.chat)) {
    body += `<h3 class="sub-title">Mentor transcript · Bradd Libby</h3>`;
    for (const turn of c.chat) {
      const who = turn.who === "brik" || turn.who === "mentor" ? "Bradd" : "Student";
      body += `<blockquote><strong>${who}:</strong> ${escapeText(turn.text ?? "")}</blockquote>`;
    }
  }
  return body;
}

function previewBody(p: DemoPreview): string {
  let html = "";
  if (p.myth) html += `<p class="lede"><strong>The myth this module dismantles:</strong> ${escapeText(p.myth)}</p>`;
  if (p.summary) html += `<p>${escapeText(p.summary)}</p>`;
  if (p.core?.length) {
    html += `<h3 class="sub-title">What you'll cover</h3><ul>`;
    for (const c of p.core) html += `<li>${escapeText(c)}</li>`;
    html += `</ul>`;
  }
  if (p.items?.length) {
    html += `<h3 class="sub-title">Planned items</h3><ul>`;
    for (const it of p.items) html += `<li>${escapeText(it)}</li>`;
    html += `</ul>`;
  }
  if (p.summative) html += `<p><strong>Summative assessment:</strong> ${escapeText(p.summative)}</p>`;
  html += `<p><em>This module unlocks in the full cohort. Module 1 (Blocks 1–5) is live now.</em></p>`;
  return html;
}

const TYPE_MAP: Record<string, ItemType> = {
  overview: ItemType.overview,
  lesson: ItemType.lesson,
  reading: ItemType.reading,
  mentor: ItemType.lesson, // scripted mentor sessions render as lessons; live AI mentor is separate
  quiz: ItemType.quiz,
  discussion: ItemType.discussion,
  assignment: ItemType.assignment,
};

async function main() {
  const { COURSE, CONTENT } = JSON.parse(readFileSync(DATA, "utf8")) as {
    COURSE: DemoCourse;
    CONTENT: Record<string, any>;
  };
  console.log(`Loaded ${COURSE.modules.length} modules, ${COURSE.previewModules?.length ?? 0} previews, ${Object.keys(CONTENT).length} content keys`);

  const course = await db.course.upsert({
    where: { slug: "disruption" },
    create: {
      slug: "disruption",
      title: COURSE.title,
      subtitle: COURSE.subtitle,
      provider: "rethinkx",
      gating: true,
      status: "live",
    },
    update: { title: COURSE.title, subtitle: COURSE.subtitle, gating: true },
  });

  const counts: Record<string, number> = {};
  let moduleNumber = 0;

  for (const m of COURSE.modules) {
    moduleNumber++;
    const mod = await db.module.upsert({
      where: { courseId_number: { courseId: course.id, number: moduleNumber } },
      create: { courseId: course.id, number: moduleNumber, title: m.title, summary: m.summary, order: moduleNumber, isPreview: false },
      update: { title: m.title, summary: m.summary, order: moduleNumber, isPreview: false },
    });
    await db.item.deleteMany({ where: { moduleId: mod.id } });

    let order = 0;
    for (const it of m.items) {
      order++;
      const raw = CONTENT[it.id] ?? {};
      const mapped = TYPE_MAP[it.type] ?? ItemType.lesson;
      let content: any;
      let passThreshold: number | null = null;

      if (it.type === "mentor") {
        content = { body: mentorBody(raw), duration: raw.duration };
      } else if (it.type === "quiz") {
        const questions = raw.questions ?? [];
        passThreshold = Math.max(1, Math.ceil(questions.length * 0.6));
        content = { questions, passThreshold };
      } else {
        content = raw;
      }

      await db.item.create({
        data: {
          moduleId: mod.id,
          type: mapped,
          title: it.title,
          order,
          duration: it.duration ?? raw.duration ?? null,
          passThreshold,
          content,
        },
      });
      counts[it.type] = (counts[it.type] ?? 0) + 1;
    }
  }

  for (const p of COURSE.previewModules ?? []) {
    moduleNumber++;
    const mod = await db.module.upsert({
      where: { courseId_number: { courseId: course.id, number: moduleNumber } },
      create: { courseId: course.id, number: moduleNumber, title: `Module ${p.num} · ${p.title}`, summary: p.summary, myth: p.myth, order: moduleNumber, isPreview: true },
      update: { title: `Module ${p.num} · ${p.title}`, summary: p.summary, myth: p.myth, order: moduleNumber, isPreview: true },
    });
    await db.item.deleteMany({ where: { moduleId: mod.id } });
    await db.item.create({
      data: { moduleId: mod.id, type: ItemType.overview, title: "Module overview (preview)", order: 1, content: { body: previewBody(p) } },
    });
    counts["preview"] = (counts["preview"] ?? 0) + 1;
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@kse.org.ua").toLowerCase();
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "KSE Admin", role: "admin" },
    update: { role: "admin" },
  });
  await db.user.upsert({
    where: { email: "student@kse.org.ua" },
    create: { email: "student@kse.org.ua", name: "Demo Student", role: "student" },
    update: {},
  });
  await db.enrollment.upsert({
    where: { userId_courseId: { userId: admin.id, courseId: course.id } },
    create: { userId: admin.id, courseId: course.id },
    update: {},
  });

  console.log("Seeded item counts:", counts);
  console.log(`Total modules: ${moduleNumber}. Admin: ${adminEmail}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
