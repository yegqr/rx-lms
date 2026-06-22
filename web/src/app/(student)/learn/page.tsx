import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCourse, getProgress, computeModuleLocks } from "@/lib/course";

export default async function Dashboard() {
  const user = await requireUser();
  const course = await getCourse();
  const progress = await getProgress(user.id);
  const locks = computeModuleLocks(course, progress);

  const allItems = course.modules.flatMap((m) => m.items);
  const done = allItems.filter((i) => progress.completed.has(i.id)).length;
  const pct = allItems.length ? Math.round((done / allItems.length) * 100) : 0;
  const realModules = course.modules.filter((m) => !m.isPreview);
  const blocksDone = realModules.filter((m) =>
    m.items.filter((i) => i.type === "quiz").every((q) => progress.completed.has(q.id)) &&
    m.items.some((i) => i.type === "quiz"),
  ).length;

  const quizScores = [...progress.bestQuiz.values()];
  const avgQuiz = quizScores.length
    ? Math.round(
        (quizScores.reduce((a, b) => a + b.score / b.total, 0) / quizScores.length) * 100,
      )
    : null;

  const next = allItems.find((i) => !progress.completed.has(i.id));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl bg-kse-navy p-8 text-white">
        <p className="text-sm font-medium text-kse-yellow">{course.subtitle ? "RethinkX × KSE" : ""}</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">{course.title}</h1>
        {course.subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            {course.subtitle}
          </p>
        )}
        {next && (
          <Link
            href={`/learn/${next.id}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-kse-yellow px-4 py-2 text-sm font-semibold text-kse-navy transition hover:brightness-95"
          >
            {done === 0 ? "Start the course" : "Continue"} →
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Progress" value={`${pct}%`} />
        <Stat label="Blocks mastered" value={`${blocksDone}/${realModules.length}`} />
        <Stat label="Avg quiz" value={avgQuiz === null ? "—" : `${avgQuiz}%`} />
      </div>

      <h2 className="mt-9 mb-3 text-lg font-semibold">Course map</h2>
      <div className="grid gap-3">
        {course.modules.map((m) => {
          const locked = locks.get(m.id) ?? false;
          const first = m.items[0];
          const mDone = m.items.filter((i) => progress.completed.has(i.id)).length;
          return (
            <Link
              key={m.id}
              href={first ? `/learn/${first.id}` : "/learn"}
              className="flex items-center gap-4 rounded-xl border border-kse-line bg-white p-4 transition hover:border-kse-navy/30 hover:shadow-sm"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${
                  m.isPreview || locked ? "bg-kse-line text-kse-muted" : "bg-kse-navy text-white"
                }`}
              >
                {m.isPreview ? "★" : locked ? "🔒" : m.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-kse-navy">{m.title}</p>
                {m.summary && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-kse-muted">{m.summary}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-kse-muted">
                {m.isPreview ? "Preview" : `${mDone}/${m.items.length}`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-kse-line bg-white p-4">
      <p className="text-2xl font-semibold text-kse-navy">{value}</p>
      <p className="mt-0.5 text-xs text-kse-muted">{label}</p>
    </div>
  );
}
