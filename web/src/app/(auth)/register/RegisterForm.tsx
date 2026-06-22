"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      setBusy(false);
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (signInRes?.error) {
      setError("Account created — please sign in.");
      window.location.href = "/login";
    } else {
      window.location.href = "/learn";
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => signIn("google", { callbackUrl: "/learn" })}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-kse-line bg-white px-4 py-2.5 text-sm font-medium text-kse-ink transition hover:bg-kse-navy-50"
      >
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-kse-muted">
        <span className="h-px flex-1 bg-kse-line" /> or <span className="h-px flex-1 bg-kse-line" />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-kse-line px-3.5 py-2.5 text-sm outline-none focus:border-kse-navy"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-kse-line px-3.5 py-2.5 text-sm outline-none focus:border-kse-navy"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (≥ 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-kse-line px-3.5 py-2.5 text-sm outline-none focus:border-kse-navy"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-kse-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-kse-navy-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
