import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/learn/SignOutButton";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/progress", label: "Progress" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/logs", label: "Logs" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-1 bg-kse-navy p-4 text-white">
        <div className="mb-4 rounded-lg bg-white/95 px-3 py-2">
          <Logo />
        </div>
        <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-white/50">Admin</p>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
          >
            {n.label}
          </Link>
        ))}
        <div className="mt-auto flex flex-col gap-2 border-t border-white/15 pt-3 text-sm">
          <Link href="/learn" className="px-3 text-white/70 hover:text-white">
            ← Back to course
          </Link>
          <div className="px-3">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-auto bg-background p-8">{children}</main>
    </div>
  );
}
