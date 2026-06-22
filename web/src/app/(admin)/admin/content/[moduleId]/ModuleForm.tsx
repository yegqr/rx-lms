"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ModuleData = {
  id: string;
  title: string;
  summary: string | null;
  myth: string | null;
  isPreview: boolean;
};

export function ModuleForm({ module }: { module: ModuleData }) {
  const router = useRouter();
  const [title, setTitle] = useState(module.title);
  const [summary, setSummary] = useState(module.summary ?? "");
  const [myth, setMyth] = useState(module.myth ?? "");
  const [isPreview, setIsPreview] = useState(module.isPreview);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/content/module", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: module.id,
        title: title.trim(),
        summary: summary.trim() || null,
        myth: myth.trim() || null,
        isPreview,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved");
      router.refresh();
    } else {
      setMsg("Save failed");
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
        />
      </Field>
      <Field label="Summary">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
        />
      </Field>
      <Field label="Myth (north-star belief challenged)">
        <textarea
          value={myth}
          onChange={(e) => setMyth(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-kse-line bg-white px-3 py-2 text-sm outline-none focus:border-kse-navy"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-kse-ink">
        <input
          type="checkbox"
          checked={isPreview}
          onChange={(e) => setIsPreview(e.target.checked)}
          className="h-4 w-4"
        />
        Preview module (accessible before enrollment / gating)
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-lg bg-kse-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save module"}
        </button>
        {msg ? <span className="text-sm text-kse-muted">{msg}</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-kse-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
