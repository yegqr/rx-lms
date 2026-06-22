# Disruption course — LMS (KSE × RethinkX)

An AI-mentored learning platform for the course *From Systemic Disruption to
Superabundance*, built by the Kyiv School of Economics and RethinkX.

Live: https://disruption.180p.org

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **PostgreSQL** + **Prisma 6**
- **Auth.js v5** — Google OAuth + email/password
- **AI mentor & grading** via the local **Claude Code CLI** (no API key) — see `web/src/lib/ai/`

## Features
- Student app: modules → lessons / readings / quizzes / seminars / essays, with
  sequential mastery gating, rich content (analogies, inline SVGs), progress tracking.
- Interactive exercises: multiple-choice, **matching**, **ordering/chronology** — instant feedback + confetti.
- Embedded video (YouTube / Vimeo / mp4).
- **AI mentor "Bradd Libby"** that sees the current page's content.
- **Instant AI essay grading** against a rubric (score + per-criterion feedback).
- **Admin CMS**: create/edit/delete/reorder modules & items, structured quiz editor, **AI exercise generation**.
- Admin: users & roles, student progress, submissions, activity logs.

## Layout
```
web/                 Next.js app (UI + API + admin)
  src/app/(auth|student|admin)/   route groups
  src/lib/           db, auth, ai (Claude CLI), course logic
  src/components/     design system + learn components
  prisma/            schema + seed
  content/           extracted course data (disruption-data.json)
upload-server/       standalone file-upload helper (Node, zero-dep)
```

## Setup
```bash
cd web
cp .env.example .env          # fill in DATABASE_URL, AUTH_SECRET, Google creds
npm install
npx prisma migrate deploy     # or: npx prisma migrate dev
npx tsx prisma/seed.ts        # seed the Disruption course + admin user
npm run build && npm run start # serves on PORT (default 3000)
```

The AI mentor/grader shell out to the `claude` CLI, so the server user must have
Claude Code installed and authenticated. Fonts: see `web/public/fonts/README.md`.

## Deployment (this server)
- systemd `rxlms-web` runs `next start` on `127.0.0.1:3100`.
- nginx vhost `disruption.180p.org` → `:3100`; `/upload` → the upload-server (`:8095`).
- Postgres in Docker (`rxlms-postgres`).
