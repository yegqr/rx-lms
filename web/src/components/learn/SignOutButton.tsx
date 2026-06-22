"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/login" })}
      className="text-sm text-kse-muted hover:text-kse-navy transition-colors"
    >
      Sign out
    </button>
  );
}
