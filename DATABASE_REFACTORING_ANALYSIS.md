# ICPC HUE — Database Deep Refactoring Analysis

> Full audit of the PostgreSQL schema, RLS policies, query patterns, data integrity,
> and security — cross-referenced against every API route in the codebase.
>
> **Date:** April 29, 2026 | **DB:** Supabase (project `jokgfcglqqrzfitfnynu`)
> **Tables:** 30 | **Users:** 104 | **Total rows:** ~37,000

---

## Table of Contents

1. [What's Done Right](#1-whats-done-right)
2. [Bugs (Broken Right Now)](#2-bugs-broken-right-now)
3. [Structural Design Issues](#3-structural-design-issues)
4. [Security Findings](#4-security-findings)
5. [Performance Issues](#5-performance-issues)
6. [Data Integrity Issues](#6-data-integrity-issues)
7. [Redundancy & Dead Weight](#7-redundancy--dead-weight)
8. [Ideal Refactored Schema](#8-ideal-refactored-schema)
9. [Priority Matrix](#9-priority-matrix)

---

## 1. What's Done Right

These are genuinely good decisions in the current schema and codebase:

### ✅ RLS Enabled on Every Table
All 30 tables have `rls_enabled = true`. Even though the app bypasses RLS (all API
routes use `pg` Pool directly as the `postgres` role, not the Supabase client), this
is defense-in-depth. If anyone ever connects via the Supabase JS client from the
browser, RLS is already there.

### ✅ Curriculum Normalization (3NF)
The `curriculum_levels → curriculum_sheets → curriculum_problems` hierarchy is properly
normalized with real FK constraints and CASCADE deletes. Deleting a level cascades to
sheets, which cascades to problems. This is textbook correct.

### ✅ Blind Indexes for Encrypted Fields
The `email_blind_index`, `student_id_blind_index`, `national_id_blind_index`, and
`telephone_blind_index` columns on `applications` and `users` allow searching encrypted
data without decrypting. This is the correct pattern for searchable encryption.

### ✅ Unique Constraints Where They Matter
- `user_progress(user_id, problem_id)` — prevents duplicate solve records
- `cf_submissions(cf_submission_id)` — prevents duplicate CF submissions
- `daily_solves(user_id, solve_date)` — one row per user per day
- `user_code(user_id, contest_id, problem_id, language) WHERE is_submitted = false` — one working draft per language
- `user_notes(user_id, contest_id, problem_index)` — one note per problem
- `user_achievements(user_id, achievement_id)` — no duplicate achievements

### ✅ Redis-Buffered Event Tracking
The `track-buffer.ts` service pushes events to a Redis list and flushes to
`user_activity` in batches of 50 or every 10 seconds. This prevents hammering
Postgres with individual INSERTs on every click/keystroke. Smart design.

### ✅ Upsert Patterns with Correct Conflict Resolution
The `user_progress` upsert correctly preserves SOLVED status:
```sql
ON CONFLICT (user_id, problem_id)
DO UPDATE SET
  status = CASE WHEN user_progress.status = 'SOLVED' THEN 'SOLVED' ELSE EXCLUDED.status END
```
Once solved, it stays solved. This is correct.

### ✅ Connection Pool Configuration
`max: 25, min: 5, statement_timeout: 15000, query_timeout: 15000` — reasonable for
a Supabase-hosted Postgres. The `pool.on('error')` handler prevents unhandled errors
from crashing the process.

### ✅ In-Memory Auth Cache
`verifyAuth()` caches Supabase auth results for 2 minutes with a SHA-256 hash of
the auth cookies as the key. This prevents hammering the Supabase Auth API during
polling (submissions poll every 2s). Max cache size of 500 entries with LRU eviction.

### ✅ Transactional Streak Updates
`updateStreakOnSolve()` uses `withTransaction()` with `FOR UPDATE` locking on
`user_streaks` to prevent race conditions when multiple submissions arrive
simultaneously.

### ✅ Advisory Locks for Campaign Sync
`syncRank1Achievement()` uses `pg_advisory_xact_lock(202603)` to prevent concurrent
rank recalculations. This is the correct approach for singleton operations.

### ✅ Check Constraints on Enums
- `users.role`: `CHECK (role IN ('trainee', 'instructor', 'owner'))`
- `user_progress.status`: `CHECK (status IN ('SOLVED', 'ATTEMPTED'))`
- `notifications.type`: `CHECK (type IN ('achievement', 'leaderboard', 'system'))`
- `news_reactions.reaction_type`: `CHECK (reaction_type IN ('like', 'heart', 'fire'))`
- `video_ratings.rating`: `CHECK (rating IN (1, -1))`

### ✅ Cleanup Function Exists
`cleanup_old_tracking_data()` has correct retention periods (90 days for activity,
30 days for errors, 180 days for login logs). The function itself is well-written.

---

## 2. Bugs (Broken Right Now)

These are things that are actively broken or silently failing in production.

### 🐛 BUG: `track/route.ts` Writes to Non-Existent Columns

**File:** `next-app/app/api/track/route.ts` (session_start handler)

The code writes `utm_source`, `utm_medium`, `utm_campaign` to `user_sessions`:
```typescript
UPDATE user_sessions SET
  screen_width = $1, ..., utm_source = $10, utm_medium = $11, utm_campaign = $12
WHERE user_id = $13 AND session_id = $14
```

**But `user_sessions` has no `utm_source`, `utm_medium`, or `utm_campaign` columns.**

The actual columns are: `id, user_id, session_id, started_at, last_seen_at, ended_at,
ip_address, user_agent, device_type, browser, os, pages_visited, problems_viewed,
submissions_made, total_events, screen_width, screen_height, viewport_width,
viewport_height, pixel_ratio, timezone, language, connection_type, referrer`.

This query silently fails on every `session_start` event (the `.catch(() => {})` swallows
the error). Device context (screen size, timezone, etc.) is never saved.

**Fix:** Either add the UTM columns to `user_sessions` or remove them from the query.

---

### 🐛 BUG: RLS on `daily_solves` and `user_streaks` Uses Impossible Cast

**Policy:** `read_own_daily_solves` and `read_own_user_streaks`

```sql
user_id = ((SELECT auth.uid())::text)::bigint
```

`auth.uid()` returns a UUID like `a1b2c3d4-e5f6-...`. Casting a UUID to text gives
`"a1b2c3d4-e5f6-..."`, and casting that to bigint will **always error**. These policies
will reject every read attempt via the Supabase client.

**Impact:** Currently zero — the app never queries these tables via Supabase client
(all access goes through `pg` Pool which bypasses RLS). But if you ever add client-side
streak display, it will break.

**Fix:** Use the same subquery pattern as other tables:
```sql
(SELECT auth.uid()) = (SELECT supabase_uid FROM users WHERE id = daily_solves.user_id)
```

---

### 🐛 BUG: RLS on `news_reactions` Uses `CURRENT_USER` Instead of `auth.uid()`

**Policies:** `Allow users to insert own reactions`, `Allow users to delete own reactions`

```sql
user_id = (SELECT id FROM users WHERE email = CURRENT_USER)
```

`CURRENT_USER` in Supabase returns the Postgres role name (e.g., `authenticated`),
not the user's email. This will never match any row in `users.email`. These policies
are effectively broken — no user can insert or delete their own reactions via the
Supabase client.

**Impact:** Currently zero (same reason — `pg` Pool bypasses RLS). But the policies
are wrong.

**Fix:** Replace `CURRENT_USER` with `(SELECT auth.uid())` and match on `supabase_uid`.

---

### 🐛 BUG: `cleanup_old_tracking_data()` Is Never Called

The function exists in the database but:
- `pg_cron` extension is **not installed** (confirmed: `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` returns empty)
- No application code calls this function
- No external cron job invokes it

**Result:** `user_activity` (27,794 rows, 12 MB), `error_logs` (4,061 rows), and
`page_navigation` (2,549 rows) grow unbounded forever.

**Fix:** Enable `pg_cron` and schedule: `SELECT cron.schedule('cleanup-tracking', '0 3 * * *', 'SELECT cleanup_old_tracking_data()');`

---

## 3. Structural Design Issues

### ⚠️ Dual Submission Tables Require UNION ALL Everywhere

`training_submissions` (Judge0 local runs) and `cf_submissions` (Codeforces) store
overlapping data with different column names and different nullable columns.

**Where UNIONs happen in the codebase:**
- `/api/submissions/route.ts` — builds dynamic UNION ALL with 6 NULL-padded columns
- `/api/user/dashboard-stats/route.ts` — `SELECT sheet_id::text ... UNION ALL ... sheet_id::text`
- `/api/admin/users/route.ts` — counts from `cf_submissions` only (ignores Judge0)

**Column differences:**

| Column | training_submissions | cf_submissions |
|---|---|---|
| test_cases_passed / total_test_cases | ✅ | ❌ |
| compile_error vs compilation_error | `compile_error` | `compilation_error` |
| runtime_error | ✅ | ❌ |
| tab_switches, paste_events | ✅ | ❌ |
| time_to_solve_seconds, attempt_number | ✅ | ❌ |
| cf_submission_id, cf_handle | ❌ | ✅ |
| url_type, group_id | ❌ | ✅ |
| details, test_number | ❌ | ✅ |

**Refactored:** One `submissions` table with `source enum('judge0','codeforces')` and
nullable source-specific columns. Eliminates every UNION ALL.

---

### ⚠️ `problem_id` Is a Constructed String, Not a FK

`user_progress.problem_id` stores strings like `"219158:A"` (contestId:problemLetter).

**Written in 3 different places with slightly different logic:**
1. `save-submission/route.ts`: `${contestId}:${problemIndex.toUpperCase()}`
2. `judge/submit/route.ts`: `${contestIdForProgress}:${problemId}` with fallback `${sheetId}:${problemId}`
3. `report-solve/route.ts`: same as #1

**Read with string concatenation:**
- `curriculum/progress/route.ts`: `s.contest_id::text || ':' || UPPER(p.problem_letter)`
- `sheets/solved/route.ts`: `problem_id LIKE '${contestId}:%'`

**Result:** 10 orphaned rows already exist in `user_progress` where `sheet_id IS NULL`
and the problem_id doesn't match any curriculum problem. These are non-curriculum solves
that can never be joined back to the curriculum.

**Refactored:** Use `curriculum_problem_id bigint REFERENCES curriculum_problems(id)` for
curriculum solves. Keep a separate `external_problem_key text` for non-curriculum solves.

---

### ⚠️ `user_preferences` Is an EAV Anti-Pattern

```
user_preferences (user_id bigint, key varchar, value text)
```

235 rows across 104 users. Keys include things like `lang:219158:A` (per-problem
language preference). No type safety, no defaults, every read requires filtering by
key string.

**However:** In this case, the EAV pattern is partially justified because the keys are
dynamic (per-problem language preferences). A fixed-column table can't handle
`lang:{contestId}:{problemId}` keys.

**Verdict:** The EAV is acceptable for dynamic per-problem preferences. But static
preferences (theme, editor font size, etc.) should be separate typed columns on a
`user_settings` table.

---

### ⚠️ `team_registrations` Is Fully Denormalized

24 columns of repeated member data (`member1_name`, `member2_name`, `member3_name`, etc.).

**Refactored:** `teams` + `team_members` tables. But with only 2 rows, this is low priority.

---

### ⚠️ `recap_2025` Is a Hardcoded Year Table

If you do yearly recaps, you'll get `recap_2026`, `recap_2027`, etc.

**Refactored:** `user_recaps` with a `year` column and composite unique on `(student_id, year)`.

---

### ⚠️ `user_progress.id` Is UUID While Everything Else Is bigint

Every other table uses `bigint GENERATED ALWAYS AS IDENTITY`. `user_progress` uses
`uuid DEFAULT gen_random_uuid()`. UUIDs are 16 bytes vs 8 bytes for bigint — doubles
the PK index size for no benefit on an internal table.

---

## 4. Security Findings

### ✅ CORRECT: All API Routes Bypass RLS via Direct `pg` Pool

Every API route uses:
```typescript
import { query } from '@/lib/db/db';
```
This connects directly to Postgres as the `postgres` role, bypassing RLS entirely.
Auth is handled by `verifyAuth()` which validates Supabase session cookies and returns
the user's internal `id`. All queries then filter by `WHERE user_id = $1`.

**This is a valid architecture.** RLS is defense-in-depth, not the primary access control.
The primary access control is `verifyAuth()` + parameterized queries.

Zero Supabase client data queries exist in the codebase (confirmed: no `supabase.from()`,
`supabase.rpc()`, `supabase.select()`, etc. anywhere in API routes or components).

---

### ⚠️ RLS on `user_sessions` UPDATE Is Too Permissive

```sql
-- INSERT policy
WITH CHECK: (SELECT auth.uid()) IS NOT NULL

-- UPDATE policy  
USING: (SELECT auth.uid()) IS NOT NULL
```

Any authenticated user can INSERT or UPDATE ANY user's session record. Only the SELECT
policy checks ownership. This is a security gap if anyone ever uses the Supabase client
to write session data.

**Current impact:** Zero (all writes go through `pg` Pool). But the policy is wrong.

---

### ⚠️ Inconsistent Encryption Coverage

| Table.Column | Status | Count |
|---|---|---|
| `users.email` | 83 legacy CryptoJS + 21 new cryptr | All encrypted ✅ |
| `applications.email` | Encrypted | ✅ |
| `applications.student_id` | **354 of 357 are plaintext numeric** | ❌ |
| `applications.national_id` | Encrypted | ✅ |
| `applications.telephone` | Encrypted | ✅ |
| `applications` blind indexes | **9 rows missing blind indexes** | ❌ |

99% of `student_id` values are stored in cleartext while the encryption infrastructure
exists. The UNIQUE constraint on `applications.student_id` operates on plaintext values
for most rows and encrypted values for 3 rows — this is inconsistent.

---

### ✅ CORRECT: `update_updated_at_column()` Has `SET search_path = public`

Migration 019 fixed the search_path vulnerability on this function. Good.

---

## 5. Performance Issues

### ⚠️ Dashboard Stats Recalculates Streak from Scratch (Ignores `user_streaks`)

**File:** `/api/user/dashboard-stats/route.ts`

The dashboard endpoint scans ALL `cf_submissions` for the user, builds a date set of
all accepted submissions, and counts consecutive days to compute the streak. This is
O(n) on the user's total submission count.

Meanwhile, `user_streaks` stores pre-computed `current_streak` and `max_streak`, and
`/api/user/streak/route.ts` correctly reads from `user_streaks` via `getUserStreak()`.

**Two different streak values can be shown:**
- Dashboard widget: recalculated from `cf_submissions` only
- Streak endpoint: reads from `user_streaks` (which counts both Judge0 and CF accepts)

**Fix:** Dashboard should read from `user_streaks` (one row fetch) instead of scanning
all submissions.

---

### ⚠️ Leaderboard Recalculated from Raw Submissions in 4 Places

The same CTE pattern appears in:
1. `/api/leaderboard/sheets/route.ts`
2. `/api/admin/users/route.ts`
3. `/api/user/dashboard-stats/route.ts` (active sheet query)
4. `lib/services/achievements.ts` (`syncRank1Achievement`)

Each one scans all `cf_submissions`, groups by user, counts distinct problem keys.

**Fix:** A materialized view or `user_solve_stats` table maintained by trigger:
```sql
CREATE TABLE user_solve_stats (
  user_id bigint PRIMARY KEY REFERENCES users(id),
  distinct_solved int DEFAULT 0,
  total_submissions int DEFAULT 0,
  last_solve_at timestamptz
);
```
Updated on every submission. Leaderboard becomes `SELECT ... ORDER BY distinct_solved DESC`.

---

### ⚠️ 30+ Indexes with Zero Scans

Since the last stats reset, these indexes have never been used:

| Index | Table | Size |
|---|---|---|
| `idx_error_logs_user_id` | error_logs | 56 KB |
| `applications_national_id_key` | applications | 56 KB |
| `idx_applications_national_id_blind` | applications | 56 KB |
| `idx_page_nav_page_path` | page_navigation | 48 KB |
| `user_progress_user_id_problem_id_key` | user_progress | 40 KB |
| `idx_page_nav_session` | page_navigation | 40 KB |
| `idx_page_navigation_user_id` | page_navigation | 40 KB |
| `users_email_key` | users | 40 KB |
| `users_supabase_uid_key` | users | 16 KB |
| `idx_notifications_unread` | notifications | 16 KB |
| `idx_user_progress_problem_id` | user_progress | 16 KB |
| `idx_user_progress_sheet_status` | user_progress | 16 KB |
| `idx_user_progress_user_status` | user_progress | 16 KB |
| `idx_daily_solves_date` | daily_solves | 16 KB |
| `idx_login_logs_session` | login_logs | 16 KB |
| `idx_user_achievements_unseen` | user_achievements | 16 KB |
| `idx_user_achievements_aid` | user_achievements | 16 KB |
| All 6 `team_registrations` indexes | team_registrations | 96 KB |
| All 3 `view_logs` indexes | view_logs | 48 KB |
| All 3 `leaderboard_rank1_history` indexes | leaderboard_rank1_history | 48 KB |

**Note:** `users_email_key` and `users_supabase_uid_key` show 0 scans because the app
queries via `pg` Pool as `postgres` role — unique constraint enforcement happens on
INSERT/UPDATE, not via index scans. These should be kept. The rest are candidates for
removal.

**Note:** Stats reset on Supabase can happen during maintenance. Zero scans doesn't
always mean "never used ever" — it means "not used since last stats reset." Use with
caution.

---

## 6. Data Integrity Issues

### ⚠️ ON DELETE Behavior Is Inconsistent

| Behavior | Tables |
|---|---|
| **CASCADE** (auto-delete) | news_reactions, notifications, user_achievements, user_notes, user_progress, video_ratings |
| **SET NULL** (preserve row) | login_logs, users→applications |
| **NO ACTION** (blocks deletion) | cf_submissions, daily_solves, error_logs, leaderboard_rank1_history, page_navigation, training_submissions, user_activity, user_code, user_custom_tests, user_preferences, user_sessions, user_streaks |

**Result:** You cannot delete a user without first manually deleting from 12 tables.
There is no full account deletion endpoint — `delete-profile-data` only clears
telegram/codeforces fields.

**Recommended:**
- CASCADE: user_code, user_custom_tests, user_preferences, user_sessions, user_streaks, daily_solves, cf_submissions, training_submissions
- SET NULL: user_activity, page_navigation, error_logs, login_logs, leaderboard_rank1_history

---

### ⚠️ `user_id` Type Mismatch (int4 vs int8)

`users.id` is `bigint` (int8). Four tables use `integer` (int4) for `user_id`:

| Table | user_id type |
|---|---|
| `leaderboard_rank1_history` | int4 |
| `news_reactions` | int4 |
| `notifications` | int4 |
| `user_notes` | int4 |

This forces implicit casts in joins and will silently truncate if user IDs ever exceed
2,147,483,647 (unlikely at 104 users, but still a schema inconsistency).

---

### ⚠️ 10 Orphaned Rows in `user_progress`

10 rows have `sheet_id IS NULL` and `problem_id` values like `"2167:A"`, `"2171:B"` that
don't match any curriculum problem. These are non-curriculum solves (e.g., regular
Codeforces contest problems) that were tracked but can never be joined to the curriculum.

This is by design (the app tracks all solves, not just curriculum ones), but the lack of
a `is_curriculum boolean` flag makes it impossible to distinguish intentional non-curriculum
solves from data corruption.

---

### ⚠️ No `updated_at` Triggers on 28 of 29 Tables

Only `users` has an `update_updated_at_column()` trigger. Tables with `updated_at`
columns but no trigger:
- `user_code`, `user_notes`, `user_preferences`, `daily_solves`, `user_streaks`,
  `video_ratings`, `curriculum_sheets`, `curriculum_levels`, `curriculum_problems`,
  `user_custom_tests`, `recap_2025`

The app sets `updated_at = NOW()` manually in queries, which works but is fragile —
any new query that forgets to set it will leave stale timestamps.

---

## 7. Redundancy & Dead Weight

### ⚠️ `applications` + `users` Data Overlap

Both tables store `email`, `telegram_username`. `applications` also stores `name`,
`faculty`, `student_id` which `users` doesn't have but needs (the admin endpoint joins
to `applications` to get the user's name).

The FK `users.application_id → applications.id` links them, but the data duplication
means updates to email must happen in both places.

---

### ⚠️ `daily_solves` + `user_streaks` Are Redundant with `cf_submissions`

`daily_solves` counts solves per day. `user_streaks` stores the current/max streak.
Both are derivable from `cf_submissions` (and `training_submissions`). The dashboard
endpoint proves this by recalculating streaks from raw submissions.

**However:** The pre-computed tables are the right approach for performance. The bug is
that the dashboard doesn't use them, not that they exist.

---

### ⚠️ `page_views` Table (13 rows) vs `view_logs` Table (61 rows)

`page_views` is a counter table (`entity_type, entity_id, views_count`).
`view_logs` tracks individual views with user attribution.
Both exist for the same feature. `view_logs` has an explicit deny-all RLS policy.

---

## 8. Ideal Refactored Schema

If starting from scratch with the same feature set:

```
── Core ──
users (id bigint PK, supabase_uid uuid UNIQUE, email_encrypted text,
       email_blind_index text UNIQUE, name text, faculty text,
       student_id_encrypted text, student_id_blind_index text,
       role enum, profile_picture varchar, codeforces_handle text,
       codeforces_data jsonb, telegram_username text,
       is_shadow_banned bool, cheating_flags int,
       show_on_cf_leaderboard bool, show_on_sheets_leaderboard bool,
       show_public_profile bool, created_at timestamptz, updated_at timestamptz)

applications (id bigint PK, user_id bigint FK→users ON DELETE SET NULL,
              application_type text, raw_data jsonb, ip_address text,
              user_agent text, submitted_at timestamptz, status enum)

── Curriculum ──
curriculum_levels (id bigint PK, level_number int UNIQUE, slug varchar UNIQUE, ...)
curriculum_sheets (id bigint PK, level_id FK→levels ON DELETE CASCADE, ...)
curriculum_problems (id bigint PK, sheet_id FK→sheets ON DELETE CASCADE,
                     contest_id text, problem_letter varchar, ...)

── Submissions (unified) ──
submissions (id bigint PK, user_id FK→users ON DELETE CASCADE,
             source enum('judge0','codeforces'),
             curriculum_problem_id bigint FK→curriculum_problems NULL,
             contest_id varchar, problem_index varchar,
             sheet_id bigint FK→curriculum_sheets NULL,
             verdict varchar, time_ms int, memory_kb int,
             language varchar, source_code text,
             -- Judge0-specific (nullable)
             test_cases_passed int, total_test_cases int,
             runtime_error text, tab_switches int, paste_events int,
             time_to_solve_seconds int, attempt_number int,
             -- CF-specific (nullable)
             cf_submission_id bigint UNIQUE, cf_handle varchar,
             url_type varchar, group_id varchar,
             -- Common
             compilation_error text, details text, test_number int,
             notes text, note_color varchar,
             ip_address text, submitted_at timestamptz DEFAULT now())

── Progress (with proper FK) ──
user_progress (id bigint PK, user_id FK→users ON DELETE CASCADE,
               curriculum_problem_id bigint FK→curriculum_problems,
               external_problem_key text,
               status enum('SOLVED','ATTEMPTED'),
               submission_id bigint FK→submissions,
               solved_at timestamptz,
               UNIQUE(user_id, curriculum_problem_id),
               UNIQUE(user_id, external_problem_key))

── Pre-computed Stats (trigger-maintained) ──
user_solve_stats (user_id bigint PK FK→users ON DELETE CASCADE,
                  distinct_solved int, total_submissions int,
                  last_solve_at timestamptz, updated_at timestamptz)

── Streaks (keep as-is, but dashboard must read from here) ──
daily_solves (user_id + solve_date PK, solve_count int)
user_streaks (user_id PK FK→users ON DELETE CASCADE,
              current_streak int, max_streak int, last_solve_date date)

── User Data (all ON DELETE CASCADE) ──
user_code, user_notes, user_custom_tests, user_preferences,
user_achievements, user_settings (typed columns for static prefs)

── Analytics (all ON DELETE SET NULL, with partitioning) ──
user_activity (PARTITION BY RANGE (created_at))
page_navigation (PARTITION BY RANGE (entered_at))
error_logs (PARTITION BY RANGE (created_at))
login_logs, user_sessions

── Teams (normalized) ──
teams (id PK, team_name, leader_phone, status, created_at)
team_members (team_id FK, member_number, name, student_id, ...)

── Misc ──
notifications, news_reactions, video_ratings, page_views,
leaderboard_rank1_history, user_recaps (with year column)
```

---

## 9. Priority Matrix

### 🔴 Fix Immediately (bugs in production)

| Issue | Effort | Section |
|---|---|---|
| `track/route.ts` writes to non-existent UTM columns | 10 min | [§2](#2-bugs-broken-right-now) |
| Schedule `cleanup_old_tracking_data()` via pg_cron | 10 min | [§2](#2-bugs-broken-right-now) |
| Fix broken RLS on `daily_solves` / `user_streaks` | 15 min | [§2](#2-bugs-broken-right-now) |
| Fix broken RLS on `news_reactions` | 15 min | [§2](#2-bugs-broken-right-now) |
| Fix `user_sessions` UPDATE policy (too permissive) | 10 min | [§4](#4-security-findings) |

### 🟡 Fix Soon (design debt with real impact)

| Issue | Effort | Section |
|---|---|---|
| Dashboard stats should read from `user_streaks` | 30 min | [§5](#5-performance-issues) |
| Add ON DELETE CASCADE/SET NULL to 12 FK constraints | 1 hour | [§6](#6-data-integrity-issues) |
| Fix `user_id` type mismatch (int4→int8) in 4 tables | 30 min | [§6](#6-data-integrity-issues) |
| Add `updated_at` triggers to tables that need them | 30 min | [§6](#6-data-integrity-issues) |
| Encrypt remaining plaintext `student_id` values | 2 hours | [§4](#4-security-findings) |

### 🟢 Refactor When Possible (structural improvements)

| Issue | Effort | Section |
|---|---|---|
| Unify `training_submissions` + `cf_submissions` | 1-2 days | [§3](#3-structural-design-issues) |
| Replace string `problem_id` with proper FK | 1-2 days | [§3](#3-structural-design-issues) |
| Add `user_solve_stats` materialized view | 4 hours | [§5](#5-performance-issues) |
| Drop unused indexes (after monitoring period) | 1 hour | [§5](#5-performance-issues) |
| Partition analytics tables | 2 hours | [§8](#8-ideal-refactored-schema) |
| Normalize `team_registrations` | 2 hours | [§3](#3-structural-design-issues) |
| Generalize `recap_2025` to `user_recaps` | 1 hour | [§3](#3-structural-design-issues) |
