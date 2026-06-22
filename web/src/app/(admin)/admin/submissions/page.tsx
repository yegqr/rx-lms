import { db } from "@/lib/db";

export default async function SubmissionsPage() {
  const submissions = await db.submission.findMany({
    orderBy: { submittedAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
      item: { select: { title: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-kse-navy">Submissions</h1>
      <p className="mt-1 text-sm text-kse-muted">{submissions.length} latest</p>
      <div className="mt-5 space-y-3">
        {submissions.length === 0 && (
          <p className="rounded-xl border border-kse-line bg-white p-5 text-sm text-kse-muted">
            No submissions yet.
          </p>
        )}
        {submissions.map((s) => (
          <div key={s.id} className="rounded-xl border border-kse-line bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-kse-navy">
                {s.user?.name ?? s.user?.email}
              </span>
              <span className="text-xs text-kse-muted">
                {s.item?.title} · {s.submittedAt.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-kse-ink">{s.text}</p>
            <span className="mt-2 inline-block rounded-full bg-kse-navy-50 px-2 py-0.5 text-xs text-kse-navy">
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
