import { db } from "@/lib/db";

export default async function AdminOverview() {
  const [users, enrollments, submissions, attempts, recent, logs] = await Promise.all([
    db.user.count(),
    db.enrollment.count(),
    db.submission.count(),
    db.quizAttempt.count(),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { email: true } } } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-kse-navy">Overview</h1>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Users" value={users} />
        <Stat label="Enrollments" value={enrollments} />
        <Stat label="Submissions" value={submissions} />
        <Stat label="Quiz attempts" value={attempts} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent signups">
          <ul className="divide-y divide-kse-line">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-kse-ink">{u.name ?? u.email}</span>
                <span className="text-xs text-kse-muted">
                  {u.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent activity">
          <ul className="divide-y divide-kse-line">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs text-kse-navy">{l.action}</span>
                <span className="truncate pl-3 text-xs text-kse-muted">
                  {l.user?.email ?? "—"} · {l.createdAt.toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-kse-line bg-white p-4">
      <p className="text-3xl font-semibold text-kse-navy">{value}</p>
      <p className="mt-1 text-xs text-kse-muted">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-kse-line bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-kse-navy">{title}</h2>
      {children}
    </div>
  );
}
