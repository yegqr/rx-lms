import Link from "next/link";
import { db } from "@/lib/db";
import { ModuleActions } from "./ModuleActions";
import { AddModule } from "./AddModule";

const COURSE_SLUG = "disruption";

export default async function ContentPage() {
  const course = await db.course.findUnique({
    where: { slug: COURSE_SLUG },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { _count: { select: { items: true } } },
      },
    },
  });

  if (!course) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-kse-navy">Content</h1>
        <p className="mt-4 rounded-xl border border-kse-line bg-white p-5 text-sm text-kse-muted">
          The <code>disruption</code> course was not found. Seed the course
          first.
        </p>
      </div>
    );
  }

  const modules = course.modules;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-kse-navy">Content</h1>
          <p className="mt-1 text-sm text-kse-muted">
            {course.title} · {modules.length} module
            {modules.length === 1 ? "" : "s"}
          </p>
        </div>
        <AddModule />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-kse-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-kse-navy-50 text-left text-xs uppercase tracking-wide text-kse-muted">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-24">Items</th>
              <th className="px-4 py-3 w-28">Preview</th>
              <th className="px-4 py-3 w-56 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kse-line">
            {modules.map((m, i) => (
              <tr key={m.id} className="align-middle">
                <td className="px-4 py-3 text-kse-muted">{m.number}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/content/${m.id}`}
                    className="font-medium text-kse-navy hover:underline"
                  >
                    {m.title}
                  </Link>
                  {m.myth ? (
                    <p className="mt-0.5 max-w-md truncate text-xs text-kse-muted">
                      {m.myth}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-kse-muted">{m._count.items}</td>
                <td className="px-4 py-3">
                  {m.isPreview ? (
                    <span className="rounded-full bg-kse-yellow-soft px-2 py-0.5 text-xs font-medium text-kse-ink">
                      preview
                    </span>
                  ) : (
                    <span className="text-xs text-kse-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ModuleActions
                    moduleId={m.id}
                    isFirst={i === 0}
                    isLast={i === modules.length - 1}
                  />
                </td>
              </tr>
            ))}
            {modules.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-kse-muted"
                >
                  No modules yet. Add one to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
