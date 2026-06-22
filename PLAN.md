# RX-LMS — Disruption LMS (KSE × RethinkX)

Turning the static demo wrapper into a real multi-user LMS.

## Decisions (locked 2026-06-22)
- **Stack:** Next.js 15 (App Router, TypeScript) + Postgres (Prisma) + Auth.js v5 (Google + email) + Tailwind.
- **Day-1 scope:** MVP **+ live AI mentor** (Claude). Course = **Disruption (RethinkX)**.
- **Hosting:** this server. `disruption.180p.org` → nginx → Next (systemd, port 3100) → Postgres (Docker `rxlms-postgres`, 127.0.0.1:55432).
- **AI fallback:** if `ANTHROPIC_API_KEY` absent, mentor uses the existing scripted sessions; live Claude activates when key is set.

## Layout
```
RX-LMS/
├─ web/                  # Next.js app (UI + API + admin)
│  ├─ src/app/(auth|student|admin)/ ...
│  ├─ src/lib/           # db, auth, ai, logger
│  ├─ src/components/    # design system ported from demo
│  ├─ prisma/schema.prisma
│  └─ content/           # seeded course content
├─ upload-server/        # file uploader (live) -> uploads/
├─ uploads/              # incoming files (+ extracted/ source demos)
└─ docs/
```

## DB (core)
User, Course, Module, Item(JSONB content), Enrollment, Progress, QuizAttempt,
Submission, Grade, DiscussionPost, MentorSession, ActivityLog, Cohort. See `web/prisma/schema.prisma`.

## Auth
Auth.js v5 — Google OAuth + email magic-link. Roles: student | instructor | admin.
Auto-enroll by invite code / email domain.

## Features
- **Must (Day-1):** Google login + registration, roles, DB-backed progress, quizzes graded,
  submissions, mastery gating, AI mentor (live/fallback), minimal admin (users/progress/logs), multi-course-ready.
- **Next:** course-builder, rubric grader, discussions, cohorts, analytics, email.
- **Later:** certificates (PDF), payments (Stripe), video (Mux), i18n (UK UI).

## Build process
Foundation (scaffold, schema, db, auth, types) built first; isolated modules
(content seed, student UI, admin, AI) built by parallel agents; then integrated & verified.

## Source assets
`uploads/extracted/rethinkx/demo/index.html` (Disruption demo, canonical for Day-1),
`uploads/extracted/brik/` (Sociology course + docs + archived admin design + AI/style docs).
