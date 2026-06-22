"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export interface NavItem {
  id: string;
  title: string;
  type: string;
  duration?: string | null;
  completed: boolean;
}
export interface NavModule {
  id: string;
  number: number;
  title: string;
  isPreview: boolean;
  locked: boolean;
  items: NavItem[];
}

const TYPE_LABEL: Record<string, string> = {
  overview: "Overview",
  lesson: "Lesson",
  reading: "Reading",
  quiz: "Quiz",
  discussion: "Seminar",
  assignment: "Essay",
};

export function Sidebar({ modules }: { modules: NavModule[] }) {
  const pathname = usePathname();
  const activeId = pathname?.split("/").pop();
  const activeModule = modules.find((m) => m.items.some((i) => i.id === activeId));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      modules.map((m) => [m.id, m.id === activeModule?.id || (!m.locked && !m.isPreview && m.number === 1)]),
    ),
  );

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {modules.map((m) => {
        const isOpen = open[m.id];
        const done = m.items.filter((i) => i.completed).length;
        return (
          <div key={m.id}>
            <button
              onClick={() => setOpen((s) => ({ ...s, [m.id]: !s[m.id] }))}
              className={clsx(
                "group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-kse-navy-50",
              )}
            >
              <span
                className={clsx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold",
                  m.isPreview
                    ? "border border-dashed border-kse-line text-kse-muted"
                    : m.locked
                      ? "bg-kse-line text-kse-muted"
                      : done === m.items.length
                        ? "bg-kse-green text-white"
                        : "bg-kse-navy text-white",
                )}
              >
                {m.isPreview ? "★" : m.locked ? "🔒" : m.number}
              </span>
              <span className="flex-1 text-[13px] font-medium leading-tight text-kse-navy">
                {m.title}
              </span>
              <span className="text-[10px] text-kse-muted">{isOpen ? "▾" : "▸"}</span>
            </button>

            {isOpen && (
              <ul className="mb-1 ml-[1.45rem] mt-0.5 flex flex-col gap-0.5 border-l border-kse-line pl-2">
                {m.items.map((it) => {
                  const active = it.id === activeId;
                  return (
                    <li key={it.id}>
                      <Link
                        href={`/learn/${it.id}`}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                          active
                            ? "bg-kse-navy text-white"
                            : "text-kse-ink hover:bg-kse-navy-50",
                        )}
                      >
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            it.completed
                              ? "bg-kse-green"
                              : active
                                ? "bg-kse-yellow"
                                : "bg-kse-line",
                          )}
                        />
                        <span className="flex-1 truncate leading-tight">{it.title}</span>
                        {it.completed && (
                          <span className={clsx("text-[10px]", active ? "text-kse-yellow" : "text-kse-green")}>✓</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
