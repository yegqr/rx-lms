import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ItemEditor } from "./ItemEditor";

export default async function ItemEditPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const item = await db.item.findUnique({
    where: { id: itemId },
    include: { module: { select: { id: true, title: true, number: true } } },
  });

  if (!item) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href={`/admin/content/${item.module.id}`}
        className="text-sm text-kse-muted hover:text-kse-navy"
      >
        ← Module {item.module.number}: {item.module.title}
      </Link>

      <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold text-kse-navy">
        {item.title}
        <span className="rounded-full bg-kse-navy-50 px-2 py-0.5 text-xs font-medium text-kse-navy">
          {item.type}
        </span>
      </h1>

      <div className="mt-5">
        <ItemEditor
          item={{
            id: item.id,
            type: item.type,
            title: item.title,
            duration: item.duration,
            passThreshold: item.passThreshold,
            moduleId: item.module.id,
            content: (item.content ?? {}) as Record<string, unknown>,
          }}
        />
      </div>
    </div>
  );
}
