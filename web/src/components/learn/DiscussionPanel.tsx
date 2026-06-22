"use client";

import { useState } from "react";

interface Post {
  id: string;
  name: string;
  role?: string;
  when?: string;
  body: string;
}

export function DiscussionPanel({
  itemId,
  prompt,
  seedPosts,
}: {
  itemId: string;
  prompt: string;
  seedPosts: Post[];
}) {
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await fetch("/api/discussion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, body }),
    });
    const data = await res.json();
    if (data.ok) {
      setPosts((p) => [
        ...p,
        { id: data.post.id, name: data.post.authorName, when: "just now", body: data.post.body },
      ]);
      setText("");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="rounded-xl border border-kse-line bg-kse-navy-50 p-4 text-sm text-kse-ink">
        {prompt}
      </div>

      <div className="mt-5 space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-kse-line bg-white p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-kse-navy">{p.name}</span>
              {p.role && <span className="text-kse-muted">· {p.role}</span>}
              {p.when && <span className="ml-auto text-xs text-kse-muted">{p.when}</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-kse-ink">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Add to the seminar…"
          className="w-full resize-none rounded-lg border border-kse-line p-3 text-sm outline-none focus:border-kse-navy"
        />
        <button
          onClick={post}
          disabled={busy || !text.trim()}
          className="mt-2 rounded-lg bg-kse-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Posting…" : "Post to seminar"}
        </button>
      </div>
    </div>
  );
}
