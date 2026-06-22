import { db } from "@/lib/db";
import { getCourse } from "@/lib/course";

export default async function ProgressPage() {
  const course = await getCourse();
  const itemIds = course.modules.flatMap((m) => m.items.map((i) => i.id));
  const totalItems = itemIds.length;

  const users = await db.user.findMany({
    where: { enrollments: { some: { course: { slug: course.slug } } } },
    include: {
      progress: { where: { completed: true, itemId: { in: itemIds } }, select: { itemId: true } },
      quizAttempts: { select: { itemId: true, score: true, total: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = users.map((u) => {
    const done = u.progress.length;
    const best = new Map<string, number>();
    for (const a of u.quizAttempts) {
      const r = a.score / a.total;
      if (!best.has(a.itemId) || r > best.get(a.itemId)!) best.set(a.itemId, r);
    }
    const avg = best.size ? [...best.values()].reduce((a, b) => a + b, 0) / best.size : null;
    return {
      id: u.id,
      name: u.name ?? u.email,
      email: u.email,
      pct: totalItems ? Math.round((done / totalItems) * 100) : 0,
      avg: avg === null ? null : Math.round(avg * 100),
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-kse-navy">Student progress</h1>
      <p className="mt-1 text-sm text-kse-muted">
        {course.title} · {rows.length} enrolled
      </p>
      <div className="mt-5 overflow-hidden rounded-xl border border-kse-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-kse-navy-50 text-left text-xs uppercase tracking-wide text-kse-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Completion</th>
              <th className="px-4 py-3">Avg quiz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kse-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-kse-ink">{r.name}</div>
                  <div className="text-xs text-kse-muted">{r.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-kse-line">
                      <div className="h-full bg-kse-green" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-kse-muted">{r.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-kse-muted">{r.avg === null ? "—" : `${r.avg}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
