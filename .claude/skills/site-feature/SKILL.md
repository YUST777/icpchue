---
name: site-feature
description: Add or change a feature on icpchue.com (next-app/) — pages, API routes, database tables/migrations, auth/roles, encryption of personal data, rate limits, Judge0, Codeforces. Use for any website, backend, Supabase or dashboard work.
---

# Adding a feature to icpchue.com

Next.js App Router in `next-app/`, deployed on Vercel. This Next.js version differs from the one in training data, so check `node_modules/next/dist/docs/` before using an API you're unsure of. Use the `@/` import alias.

## How data flows
Browser → `app/api/<feature>/route.ts` → `query()` (raw SQL through `pg`) → Supabase Postgres.
- **Supabase is used for login only** (auth cookies). The browser **never** reads tables directly. PostgREST is locked down, so every table has RLS on with no policies and no grants to `anon` or `authenticated`. All data goes through API routes.
- DB: `import { query, withTransaction } from '@/lib/db/db'`. Always use `$1` parameters, never build SQL by joining strings. The pool is tiny (serverless), so don't hold clients open.
- The app's user id is `users.id` (a number), not the Supabase uid. Map with `users.supabase_uid`.

## Auth and roles
Roles in `users.role`: `trainee` (default), `mentor`, `instructor`, `owner`.
- API routes (`lib/auth/auth.ts`):
  ```ts
  const user = await verifyAuth(req);          // or verifyMentor / verifyAdmin (instructor+owner)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  ```
  Always filter rows by `user.id` so users only touch their own data.
- Server pages/layouts: `await requireDashboardRole(['mentor','instructor','owner'], '/dashboard/x')` from `lib/auth/server-guards.ts` (example: `app/dashboard/mentor/layout.tsx`). The API check is still required as well.
- Mentors only see their own trainees. Use `mentorVisibleUserIds(user)` from `lib/auth/mentor-scope.ts`, where `null` means "sees everyone".
- Login-protected path prefixes: `PROTECTED_PREFIXES` in `lib/supabase/middleware.ts`.
- Supabase clients: `lib/supabase/server.ts` (server components), `client.ts` (browser, auth only), `admin.ts` (service role, server only: auth admin tasks).

## Personal data (encryption)
`lib/security/encryption.ts`: `encrypt` and `decrypt` use AES-256-GCM via cryptr with `DB_ENCRYPTION_KEY`. `createBlindIndex(value)` is a salted hash you can search with `WHERE x_hash = $1`.
- Phone numbers, national IDs and similar personal fields are stored encrypted, with a blind-index column if you need to look them up. Example: `lib/apply/training-registration.ts` (lines ~80-125).
- `decrypt` only on the server, and only return the fields the screen needs.

## Email (Brevo)
- **Auth emails** (OTP code at register/login, password reset) are sent by **Supabase Auth**, which uses Brevo as its custom SMTP (set in the Supabase dashboard → Auth → SMTP, not in the code). Routes: `app/api/auth/send-otp` (`signInWithOtp`), `verify-otp`, `forgot-password` (`resetPasswordForEmail`), `reset-password`. The email HTML lives in repo `supabase/templates/{confirmation,recovery}.html`. Paste changes into Supabase → Auth → Email Templates, because editing the file alone changes nothing.
- **Any other email** (notifications, announcements): `sendEmail({ to, subject, html })` from `@/lib/services/email` (nodemailer SMTP, env `SMTP_SERVER`, `SMTP_PORT`, `SMTP_LOGIN`, `SMTP_PASSWORD`, `SENDER_EMAIL`, `SENDER_NAME`, pointed at Brevo's SMTP relay). No route uses it yet, so check the env vars on Vercel before relying on it. Rate-limit any route that sends email.
- Tests: `npm run test:otp`, `npm run test:password-reset`, `npm run otp:smoke` (CI: `.github/workflows/otp.yml`).
- Brevo's free plan has a daily send limit. Bulk sends should be batched, not one request per user in a loop.

## Other building blocks
- Rate limit: `rateLimit(\`feature:${user.id}\`, 10, 60)` from `@/lib/cache/rate-limit`. Use it on every write route or expensive route.
- Client IP: `getClientIp(req)` from `lib/security/request.ts`. Captcha: `lib/security/captcha.ts`. Input cleanup: `lib/security/validation.ts`.
- Client fetch: `fetchWithAuth` in `lib/api.ts`. Auth state: `contexts/AuthContext.tsx`. EN/AR text: `contexts/LanguageContext.tsx` + `lib/translations.ts`.
- Code running: Judge0 (`app/api/judge/*`, env `JUDGE0_API_URL`/`JUDGE0_AUTH_TOKEN`, server setup in `infrastructure/judge0-azure/`).
- Codeforces: `lib/services/codeforces.ts`. The browser extension bridge is in `extension/`.
- Shared helpers live in folders: `lib/{auth,db,security,cache,services,supabase}`. The flat `lib/*.ts` files are only re-exports, so import from the folder.

## Database changes
1. Add `next-app/supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`. This is the only migration folder in use; `next-app/migrations/` and `database/` are old.
2. Every new table: `ENABLE ROW LEVEL SECURITY; REVOKE ALL ... FROM PUBLIC, anon, authenticated;` (and the same for its sequence). Copy `20261021030000_mentor_trainees.sql`.
3. Add indexes for the columns you filter on. Apply through the Supabase MCP or SQL editor, and **ask before running anything on production**.

## Where things go
- Page: `app/<route>/page.tsx`. Dashboard pages go in `app/dashboard/<feature>/`. Components go in `components/<feature>/`.
- API: `app/api/<feature>/route.ts` (export `GET`/`POST`/...).
- One-time data scripts: `scripts/one-off/` (they load `../../.env`).

## Before you're done
- `npm run lint` in `next-app/`. `npx tsc --noEmit` already has about 30 old errors, so only make sure you added none.
- If it's a UI change, open it in the dev server (`npm run dev`, port 3000) and check it on a phone width too.
- Commit style: `feat(area): ...` / `fix(area): ...`. Only commit when asked.
