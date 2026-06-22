"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    setValue(next);
    await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded-md border border-kse-line bg-white px-2 py-1 text-sm outline-none focus:border-kse-navy"
    >
      <option value="student">student</option>
      <option value="instructor">instructor</option>
      <option value="admin">admin</option>
    </select>
  );
}
