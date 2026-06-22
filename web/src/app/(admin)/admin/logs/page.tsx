import Link from "next/link";
import { db } from "@/lib/db";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const actions = await db.activityLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });
  const logs = await db.activityLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-kse-navy">Activity logs</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip label="all" href="/admin/logs" active={!action} />
        {actions.map((a) => (
          <FilterChip
            key={a.action}
            label={a.action}
            href={`/admin/logs?action=${encodeURIComponent(a.action)}`}
            active={action === a.action}
          />
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-kse-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-kse-navy-50 text-left text-xs uppercase tracking-wide text-kse-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kse-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-kse-muted">
                  {l.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-kse-navy">{l.action}</td>
                <td className="px-4 py-2.5 text-xs text-kse-muted">{l.user?.email ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-kse-muted">
                  {l.meta ? JSON.stringify(l.meta) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-kse-navy px-3 py-1 text-xs font-medium text-white"
          : "rounded-full border border-kse-line bg-white px-3 py-1 text-xs text-kse-muted hover:border-kse-navy/40"
      }
    >
      {label}
    </Link>
  );
}
