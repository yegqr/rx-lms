import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCourse, getProgress, computeModuleLocks } from "@/lib/course";
import { Logo } from "@/components/brand/Logo";
import { Sidebar, type NavModule } from "@/components/learn/Sidebar";
import { SignOutButton } from "@/components/learn/SignOutButton";
import { HideableProgress } from "@/components/learn/HideableProgress";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const course = await getCourse();
  const progress = await getProgress(user.id);
  const locks = computeModuleLocks(course, progress);

  const allItems = course.modules.flatMap((m) => m.items);
  const completedCount = allItems.filter((i) => progress.completed.has(i.id)).length;
  const pct = allItems.length ? Math.round((completedCount / allItems.length) * 100) : 0;

  const navModules: NavModule[] = course.modules.map((m) => ({
    id: m.id,
    number: m.number,
    title: m.title,
    isPreview: m.isPreview,
    locked: locks.get(m.id) ?? false,
    items: m.items.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      duration: i.duration,
      completed: progress.completed.has(i.id),
    })),
  }));

  const initials = (user.name ?? user.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-kse-line bg-white/90 px-5 py-3 backdrop-blur">
        <Link href="/learn">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <HideableProgress pct={pct} />
          {(user.role === "admin" || user.role === "instructor") && (
            <Link href="/admin" className="text-sm text-kse-muted hover:text-kse-navy">
              Admin
            </Link>
          )}
          <SignOutButton />
          <span
            className="grid h-8 w-8 place-items-center rounded-full bg-kse-navy text-xs font-semibold text-white"
            title={user.email ?? ""}
          >
            {initials}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-kse-line lg:block">
          <Sidebar modules={navModules} />
        </aside>
        <main className="min-w-0 flex-1 px-5 py-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
