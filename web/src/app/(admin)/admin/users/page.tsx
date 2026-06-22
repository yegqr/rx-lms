import { db } from "@/lib/db";
import { RoleSelect } from "./RoleSelect";

export default async function UsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-kse-navy">Users</h1>
      <p className="mt-1 text-sm text-kse-muted">{users.length} total</p>
      <div className="mt-5 overflow-hidden rounded-xl border border-kse-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-kse-navy-50 text-left text-xs uppercase tracking-wide text-kse-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Enrollments</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kse-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-kse-ink">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-kse-muted">{u.email}</td>
                <td className="px-4 py-3 text-kse-muted">{u._count.enrollments}</td>
                <td className="px-4 py-3 text-kse-muted">{u.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <RoleSelect userId={u.id} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
