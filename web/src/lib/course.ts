import { db } from "@/lib/db";

export const COURSE_SLUG = process.env.DEFAULT_COURSE_SLUG ?? "disruption";

export type ModuleWithItems = Awaited<ReturnType<typeof getCourse>>["modules"][number];

/** Load the active course with modules+items ordered. */
export async function getCourse(slug: string = COURSE_SLUG) {
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) throw new Error(`Course not found: ${slug}`);
  return course;
}

export interface ProgressView {
  completed: Set<string>;
  quizPassed: Set<string>; // itemIds of passed quizzes
  bestQuiz: Map<string, { score: number; total: number }>;
}

export async function getProgress(userId: string): Promise<ProgressView> {
  const [progress, attempts] = await Promise.all([
    db.progress.findMany({ where: { userId, completed: true } }),
    db.quizAttempt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);
  const completed = new Set(progress.map((p) => p.itemId));
  const bestQuiz = new Map<string, { score: number; total: number }>();
  for (const a of attempts) {
    const prev = bestQuiz.get(a.itemId);
    if (!prev || a.score > prev.score) bestQuiz.set(a.itemId, { score: a.score, total: a.total });
  }
  const quizPassed = new Set([...completed].filter((id) => bestQuiz.has(id)));
  return { completed, quizPassed, bestQuiz };
}

/**
 * Sequential mastery gating: a module is unlocked if it's the first real module,
 * a preview, or the previous real module's quiz items are all completed.
 */
export function computeModuleLocks(
  course: Awaited<ReturnType<typeof getCourse>>,
  progress: ProgressView,
): Map<string, boolean> {
  const locks = new Map<string, boolean>();
  if (!course.gating) {
    for (const m of course.modules) locks.set(m.id, false);
    return locks;
  }
  let prevSatisfied = true;
  for (const m of course.modules) {
    if (m.isPreview) {
      locks.set(m.id, true); // previews are always "locked" (browse-only summary)
      continue;
    }
    locks.set(m.id, !prevSatisfied);
    // this module satisfied if all its quiz items are completed
    const quizzes = m.items.filter((i) => i.type === "quiz");
    const satisfied =
      quizzes.length === 0 || quizzes.every((q) => progress.completed.has(q.id));
    prevSatisfied = prevSatisfied && satisfied;
  }
  return locks;
}

export function stripHtml(html: string, max = 4000): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
