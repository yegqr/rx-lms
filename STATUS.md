# RX-LMS — status

**Live:** https://disruption.180p.org  ·  built 2026-06-22

## Working now
- Next.js 16 LMS (systemd `rxlms-web`, :3100) behind nginx + Cloudflare.
- Auth.js v5 — email/password registration **works now**; Google OAuth pending creds.
- Postgres (Docker `rxlms-postgres`, :55432), seeded: Disruption course, 10 modules / 37 items.
- Student app: dashboard, sidebar, lessons/readings, quizzes (graded, mastery gating 60%),
  discussions, assignments — all DB-backed, multi-device.
- **AI mentor "Bradd Libby"** via local Claude Code CLI (no API key). Tested end-to-end.
- Admin: overview, users + role control, progress, submissions, activity logs.
- Real KSE brand: navy #003863 + yellow #f1e935, Graphik font, KSE mark.
- File-upload tool preserved at `/upload` (PUT) and `/uploader` (page).

## Needs you
- **Google OAuth**: create a Web OAuth client in Google Cloud Console.
  - Authorized origin: `https://disruption.180p.org`
  - Redirect URI: `https://disruption.180p.org/api/auth/callback/google`
  - Put `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `web/.env`, then `sudo systemctl restart rxlms-web`.

## Ops
- Rebuild: `cd web && npm run build && sudo systemctl restart rxlms-web`
- Re-seed: `cd web && npx tsx prisma/seed.ts`
- Migrate: `cd web && npx prisma migrate dev`
- Seeded admin: `admin@kse.org.ua` (sign in via Google once configured).
