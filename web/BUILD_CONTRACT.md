# RX-LMS build contract (read before coding)

You are building one isolated slice of a Next.js 16 + Prisma + Auth.js v5 LMS.
The FOUNDATION is already built and working. Do NOT modify foundation files
(listed below) — only import from them.

## CRITICAL: Next.js 16 breaking changes
Read `./AGENTS.md` and the relevant files under `node_modules/next/dist/docs/01-app/`
before writing code. Key gotchas already confirmed in this version:
- `params` and `searchParams` are **Promises**: `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params`.
- `cookies()`, `headers()`, `draftMode()` are **async** — `await cookies()`.
- Route handlers live in `route.ts` exporting `GET`/`POST` etc.
- Do auth-gating in server-component **layouts** (Node runtime), NOT middleware
  (Prisma is not edge-safe). Use the helpers in `src/lib/session.ts`.

## Foundation (import, don't edit)
- `src/lib/db.ts` → `import { db } from "@/lib/db"` (Prisma client singleton).
- `src/auth.ts` → `import { auth, signIn, signOut } from "@/auth"`.
- `src/lib/session.ts` → `requireUser()`, `requireAdmin()`, `getOptionalUser()`.
- `src/lib/logger.ts` → `logActivity(action, { userId, meta, ip })`.
- `src/lib/content-types.ts` → canonical `Item.content` shapes + `SeedCourse`.
- `src/lib/ai/mentor.ts` → `mentorReply(messages, ctx)` (Claude CLI mentor).
- `src/components/brand/Logo.tsx`, `src/components/providers.tsx`.
- `prisma/schema.prisma` (migrated). Auth route at `src/app/api/auth/[...nextauth]/route.ts`.

## Design system (KSE brand) — use these, no generic AI look
Tailwind v4 tokens are defined in `src/app/globals.css`:
- Colors: `kse-navy` (#003863, primary), `kse-yellow` (#f1e935, signature accent),
  `kse-green`, `kse-blue`, `kse-navy-50`, `kse-yellow-soft`, `kse-ink`, `kse-muted`,
  `kse-line`, `kse-card`. Use as `bg-kse-navy`, `text-kse-yellow`, `border-kse-line`, etc.
- Font: Graphik (already loaded as `--font-sans`). Headings are navy + tight tracking.
- Long-form prose: wrap HTML in `<div className="prose-kse" dangerouslySetInnerHTML=...>`.
- Use the KSE mark at `/brand/kse-mark.png` via `<Logo/>`.
- Aesthetic: clean, editorial, institutional. Navy primary, yellow as the highlight/CTA
  accent (sparingly, like KSE's site), generous white space, rounded-xl cards, subtle borders.

## Prisma models (see schema.prisma)
User(role: student|instructor|admin), Course(slug,title,provider,gating),
Module(courseId,number,title,summary,myth,order,isPreview),
Item(moduleId,type,title,order,duration,passThreshold,content Json),
Enrollment(userId,courseId), Progress(userId,itemId,completed),
QuizAttempt(userId,itemId,score,total,answers), Submission(userId,itemId,text,status),
Grade(submissionId,scores,feedback,total), DiscussionPost(userId,itemId,body),
MentorSession(userId,itemId,messages), ActivityLog(action,userId,meta), Cohort.

## API conventions
- All mutating routes: get user via `const session = await auth()` then check `session.user.id`.
- Return `NextResponse.json(...)`. Validate input with `zod`.
- Log meaningful actions with `logActivity`.

## App routes (ownership is split per agent — stay in your lane)
- Student UI + student APIs: `src/app/(student)/**`, `src/components/**`,
  `src/app/api/{progress,quiz,submission,discussion,mentor}/route.ts`.
- Auth pages + Admin + admin APIs: `src/app/(auth)/**`, `src/app/(admin)/**`,
  `src/app/api/{register,admin}/**`.
- Content seed: `content/disruption.ts`, `prisma/seed.ts`.

The student dashboard is `/learn`; a course item is `/learn/[itemId]`. Admin is `/admin`.
Login is `/login`, register `/register`.
