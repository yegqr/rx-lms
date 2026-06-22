"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ItemActions({
  itemId,
  isFirst,
  isLast,
}: {
  itemId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(direction: "up" | "down") {
    setBusy(true);
    await fetch("/api/admin/content/item", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, direction }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this item?")) return;
    setBusy(true);
    await fetch("/api/admin/content/item", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        disabled={busy || isFirst}
        onClick={() => move("up")}
        title="Move up"
        className="rounded-md border border-kse-line px-2 py-1 text-kse-muted hover:bg-kse-navy-50 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={busy || isLast}
        onClick={() => move("down")}
        title="Move down"
        className="rounded-md border border-kse-line px-2 py-1 text-kse-muted hover:bg-kse-navy-50 disabled:opacity-30"
      >
        ↓
      </button>
      <Link
        href={`/admin/content/item/${itemId}`}
        className="rounded-md border border-kse-line px-2 py-1 text-xs font-medium text-kse-navy hover:bg-kse-navy-50"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
