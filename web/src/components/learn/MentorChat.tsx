"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function MentorChat({
  itemId,
  initial,
}: {
  itemId: string;
  initial?: Msg[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(
    initial?.length
      ? initial
      : [
          {
            role: "assistant",
            content:
              "I'm Bradd, your AI mentor for this course. Ask me anything about this page — or bring me a disruption from your own sector and we'll pressure-test it together.",
          },
        ],
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          messages: next.filter((m) => m.content),
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "…" }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Connection hiccup — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-kse-navy px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-kse-navy-700"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-kse-yellow text-kse-navy">
          BL
        </span>
        {open ? "Close mentor" : "Ask Bradd"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-30 flex h-[32rem] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-kse-line bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-kse-line bg-kse-navy px-4 py-3 text-white">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-kse-yellow text-xs font-bold text-kse-navy">
              BL
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">Bradd Libby</p>
              <p className="mt-0.5 text-[11px] text-white/70">AI mentor</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={clsx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-kse-navy text-white"
                    : "bg-kse-navy-50 text-kse-ink",
                )}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] rounded-2xl bg-kse-navy-50 px-3.5 py-2 text-sm text-kse-muted">
                Bradd is thinking…
              </div>
            )}
          </div>

          <div className="border-t border-kse-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask about this page…"
                className="max-h-28 flex-1 resize-none rounded-lg border border-kse-line px-3 py-2 text-sm outline-none focus:border-kse-navy"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="rounded-lg bg-kse-navy px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
