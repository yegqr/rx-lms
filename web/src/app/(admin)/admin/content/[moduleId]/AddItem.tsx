"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  "lesson",
  "reading",
  "overview",
  "quiz",
  "discussion",
  "assignment",
] as const;

export function AddItem({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof TYPES)[number]>("lesson");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/admin/content/item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId,
        type,
        ...(title.trim() ? { title: title.trim() } : {}),
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setOpen(false);
      setTitle("");
      if (data?.item?.id) {
        router.push(`/admin/content/item/${data.item.id}`);
      } else {
        router.refresh();
      }
    } else {
      alert("Could not create item");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-kse-navy px-4 py-2 text-sm font-medium text-white hover:bg-kse-navy/90"
      >
        ＋ Add item
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
        className="rounded-md border border-kse-line bg-white px-2 py-2 text-sm outline-none focus:border-kse-navy"
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
      />
      <button
        type="button"
        disabled={busy}
        onClick={create}
        className="rounded-lg bg-kse-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg border border-kse-line px-3 py-2 text-sm text-kse-muted"
      >
        Cancel
      </button>
    </div>
  );
}
