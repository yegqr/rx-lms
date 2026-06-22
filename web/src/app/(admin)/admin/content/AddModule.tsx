"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddModule() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/content/module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setOpen(false);
      router.refresh();
    } else {
      alert("Could not create module");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-kse-navy px-4 py-2 text-sm font-medium text-white hover:bg-kse-navy/90"
      >
        ＋ Add module
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Module title"
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
