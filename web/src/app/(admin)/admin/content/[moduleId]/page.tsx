import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ModuleForm } from "./ModuleForm";
import { ItemActions } from "./ItemActions";
import { AddItem } from "./AddItem";

export default async function ModuleEditPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;

  const module = await db.module.findUnique({
    where: { id: moduleId },
    include: { items: { orderBy: { order: "asc" } } },
  });

  if (!module) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/content"
        className="text-sm text-kse-muted hover:text-kse-navy"
      >
        ← All modules
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-kse-navy">
        Module {module.number}
      </h1>

      <div className="mt-5 rounded-xl border border-kse-line bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-kse-navy">
          Module details
        </h2>
        <ModuleForm
          module={{
            id: module.id,
            title: module.title,
            summary: module.summary,
            myth: module.myth,
            isPreview: module.isPreview,
          }}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-kse-navy">
          Items · {module.items.length}
        </h2>
        <AddItem moduleId={module.id} />
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-kse-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-kse-navy-50 text-left text-xs uppercase tracking-wide text-kse-muted">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3 w-32">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-28">Duration</th>
              <th className="px-4 py-3 w-56 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kse-line">
            {module.items.map((it, i) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-kse-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-kse-navy-50 px-2 py-0.5 text-xs font-medium text-kse-navy">
                    {it.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/content/item/${it.id}`}
                    className="font-medium text-kse-navy hover:underline"
                  >
                    {it.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-kse-muted">
                  {it.duration ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ItemActions
                    itemId={it.id}
                    isFirst={i === 0}
                    isLast={i === module.items.length - 1}
                  />
                </td>
              </tr>
            ))}
            {module.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-kse-muted"
                >
                  No items yet. Add one above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
