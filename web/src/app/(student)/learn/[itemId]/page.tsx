import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getCourse, getProgress, computeModuleLocks } from "@/lib/course";
import { MarkComplete } from "@/components/learn/MarkComplete";
import { QuizDispatch } from "@/components/learn/QuizDispatch";
import VideoBlock from "@/components/learn/VideoBlock";
import { MentorChat } from "@/components/learn/MentorChat";
import { DiscussionPanel } from "@/components/learn/DiscussionPanel";
import { AssignmentPanel } from "@/components/learn/AssignmentPanel";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const user = await requireUser();
  const course = await getCourse();
  const progress = await getProgress(user.id);
  const locks = computeModuleLocks(course, progress);

  const flat = course.modules.flatMap((m) => m.items.map((i) => ({ ...i, module: m })));
  const idx = flat.findIndex((i) => i.id === itemId);
  if (idx < 0) notFound();
  const item = flat[idx];
  const prev = flat[idx - 1];
  const next = flat[idx + 1];
  const content = item.content as Record<string, any>;
  const completed = progress.completed.has(item.id);
  const moduleLocked = locks.get(item.module.id) ?? false;

  // Preview modules: show the summary overview but nothing interactive.
  if (item.module.isPreview) {
    return (
      <Article title={item.module.title} kicker="Preview">
        <div className="prose-kse" dangerouslySetInnerHTML={{ __html: content.body ?? "" }} />
      </Article>
    );
  }

  if (moduleLocked) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-kse-line bg-white p-10 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-semibold">This block is locked</h1>
        <p className="mt-2 text-sm text-kse-muted">
          Pass the previous block&apos;s mastery check (60%) to unlock it.
        </p>
        <Link
          href="/learn"
          className="mt-5 inline-block rounded-lg bg-kse-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Back to course map
        </Link>
      </div>
    );
  }

  const kicker = `${item.module.title} · Block ${item.module.number}`;
  const showMentor = true; // mentor is available on every page

  let body: React.ReactNode;

  if (item.type === "quiz") {
    body = <QuizDispatch itemId={item.id} content={content} />;
  } else if (item.type === "discussion") {
    const userPosts = await db.discussionPost.findMany({
      where: { itemId: item.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    const seed = (content.posts ?? []).map((p: any, i: number) => ({
      id: `seed-${i}`,
      name: p.name,
      role: p.role,
      when: p.when,
      body: p.body,
    }));
    const live = userPosts.map((p) => ({
      id: p.id,
      name: p.user?.name ?? p.user?.email ?? "Student",
      when: p.createdAt.toLocaleDateString(),
      body: p.body,
    }));
    body = (
      <DiscussionPanel
        itemId={item.id}
        prompt={content.prompt ?? content.body ?? ""}
        seedPosts={[...seed, ...live]}
      />
    );
  } else if (item.type === "assignment") {
    const submission = await db.submission.findUnique({
      where: { userId_itemId: { userId: user.id, itemId: item.id } },
    });
    body = (
      <AssignmentPanel
        itemId={item.id}
        brief={content.brief ?? content.body ?? ""}
        rubric={content.rubric}
        dueDate={content.dueDate}
        initialText={submission?.text ?? undefined}
      />
    );
  } else {
    // overview / lesson / reading
    body = (
      <>
        {content.videoUrl && (
          <div className="mb-6">
            <VideoBlock url={content.videoUrl} title={item.title} />
          </div>
        )}
        <div
          className="prose-kse max-w-none"
          dangerouslySetInnerHTML={{ __html: content.body ?? "" }}
        />
        <div className="mt-8">
          <MarkComplete itemId={item.id} completed={completed} />
        </div>
      </>
    );
  }

  let mentorInitial;
  if (showMentor) {
    const sess = await db.mentorSession.findFirst({ where: { userId: user.id, itemId: item.id } });
    if (sess?.messages) {
      mentorInitial = (sess.messages as any[]).map((m) => ({ role: m.role, content: m.content }));
    }
  }

  return (
    <>
      <Article title={item.title} kicker={kicker} duration={item.duration}>
        {body}
      </Article>

      <nav className="mx-auto mt-10 flex max-w-3xl items-center justify-between border-t border-kse-line pt-5">
        {prev ? (
          <Link href={`/learn/${prev.id}`} className="text-sm text-kse-muted hover:text-kse-navy">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/learn/${next.id}`}
            className="text-sm font-medium text-kse-navy hover:underline"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {showMentor && <MentorChat itemId={item.id} initial={mentorInitial} />}
    </>
  );
}

function Article({
  title,
  kicker,
  duration,
  children,
}: {
  title: string;
  kicker?: string;
  duration?: string | null;
  children: React.ReactNode;
}) {
  return (
    <article key={title} className="fade-in mx-auto max-w-3xl">
      {kicker && (
        <p className="text-xs font-semibold uppercase tracking-wide text-kse-muted">{kicker}</p>
      )}
      <h1 className="mt-1.5 text-2xl font-semibold text-kse-navy">{title}</h1>
      {duration && <p className="mt-1 text-sm text-kse-muted">{duration}</p>}
      <div className="mt-6">{children}</div>
    </article>
  );
}
