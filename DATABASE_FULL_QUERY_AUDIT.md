# ICPC HUE — Full Database Query Audit

> Every SQL query in every API route, cross-referenced against the actual schema.
> Each query is marked ✅ (correct), ⚠️ (design issue), or 🐛 (bug).
>
> **Date:** April 29, 2026 | **Routes audited:** 55 | **Queries found:** 95+

---

## Table of Contents

1. [New Bugs Found (queries hitting missing tables/columns)](#1-new-bugs-found)
2. [Query-by-Query Audit (by route)](#2-query-by-query-audit)
3. [Cross-Cutting Patterns](#3-cross-cutting-patterns)
4. [SQL Injection Analysis](#4-sql-injection-analysis)
5. [Summary Statistics](#5-summary-statistics)

---

## 1. New Bugs Found

These are queries that reference tables or columns that **do not exist** in the database.

### 🐛 BUG: `workspace/sync/route.ts` → `user_workspaces` table does not exist

Both GET and POST query `user_workspaces`:
```sql
SELECT saved_code, selected_language, custom_test_cases, whiteboard_data,
       ai_chat_messages, ai_chat_tabs, ai_chat_concepts, ai_chat_inputs
FROM user_workspaces WHERE user_id = $1 AND problem_id = $2
```
**Table `user_workspaces` does not exist.** Confirmed via `information_schema.tables`.
Every call to this endpoint returns a 500 error (caught by try/catch, returns generic error).

---

### 🐛 BUG: `submissions/route.ts` and `submissions/[id]/route.ts` → `notes`, `note_color` columns missing

The unified submissions query selects `ts.notes, ts.note_color` from `training_submissions`
and `cf.notes, cf.note_color` from `cf_submissions`. The PATCH endpoint updates these columns.

**Neither `training_submissions` nor `cf_submissions` has `notes` or `note_color` columns.**

Actual `training_submissions` columns: `id, user_id, sheet_id, problem_id, source_code, language,
verdict, time_ms, memory_kb, test_cases_passed, total_test_cases, compile_error, runtime_error,
submitted_at, ip_address, tab_switches, paste_events, time_to_solve_seconds, attempt_number`

Actual `cf_submissions` columns: `id, user_id, cf_submission_id, contest_id, problem_index,
sheet_id, verdict, time_ms, memory_kb, language, source_code, cf_handle, url_type, group_id,
submitted_at, details, test_number, compilation_error`

**No `notes` or `note_color` in either table.** The SELECT queries silently fail (Postgres
will error on unknown columns), and the PATCH updates silently fail too.

---

### 🐛 BUG: `submit-application/route.ts` → `leetcode_profile` column missing

```sql
INSERT INTO applications (..., leetcode_profile, ...) VALUES (...)
```
**`applications` has no `leetcode_profile` column.** The column list shows: `id, application_type,
name, faculty, student_id, national_id, student_level, telephone, has_laptop, codeforces_profile,
codeforces_data, scraping_status, ip_address, user_agent, email, submitted_at, telegram_username,
email_blind_index, national_id_blind_index, telephone_blind_index, student_id_blind_index`.

This INSERT will fail with a column-not-found error every time a new application is submitted
via this legacy endpoint.

The `register/route.ts` also references `leetcode_profile` in its INSERT, same bug.

---

### 🐛 BUG: `track/route.ts` → `utm_source`, `utm_medium`, `utm_campaign` columns missing

(Previously documented) The `session_start` handler writes UTM columns that don't exist on
`user_sessions`. Every session_start event silently fails.

---

### 🐛 BUG: `profile/[studentId]/route.ts` → `leetcode_profile` column missing

```sql
SELECT name, faculty, student_level, codeforces_profile, leetcode_profile, ...
FROM applications WHERE id = $1
```
Same issue — `leetcode_profile` doesn't exist on `applications`. This query will error.

---

## 2. Query-by-Query Audit

### Auth Routes

#### `auth/login/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, application_id FROM users WHERE supabase_uid = $1` | users | ✅ Parameterized, correct |
| 2 | `UPDATE users SET last_login_at = NOW() WHERE id = $1` | users | ✅ Fire-and-forget, correct |
| 3 | `INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES ($1, $2, $3)` | login_logs | ✅ Parameterized |

#### `auth/check-application/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT 1 FROM email_verifications WHERE email_blind_index = $1` | email_verifications | ✅ |
| 2 | `SELECT id, name FROM applications WHERE email_blind_index = $1` | applications | ✅ |

#### `auth/check-email/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id FROM applications WHERE email_blind_index = $1` | applications | ✅ |
| 2 | `SELECT id FROM users WHERE email_blind_index = $1` | users | ✅ |

#### `auth/register/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT 1 FROM email_verifications WHERE email_blind_index = $1` | email_verifications | ✅ |
| 2 | `SELECT id, name FROM applications WHERE email_blind_index = $1` | applications | ✅ |
| 3 | `SELECT id FROM users WHERE email_blind_index = $1` | users | ✅ |
| 4 | `SELECT id FROM users WHERE application_id = $1` | users | ✅ |
| 5 | `SELECT id FROM applications WHERE telephone_blind_index = $1 OR student_id_blind_index = $2` | applications | ✅ |
| 6 | `UPDATE applications SET email = $1, ... WHERE id = $13` | applications | ✅ 13 params |
| 7 | `INSERT INTO applications (..., leetcode_profile, ...) VALUES (...)` | applications | 🐛 `leetcode_profile` column missing |
| 8 | `INSERT INTO users (email, email_blind_index, application_id, supabase_uid) VALUES (...)` | users | ✅ |
| 9 | `UPDATE applications SET scraping_status = 'not_applicable' WHERE id = $1` | applications | ✅ |
| 10 | `DELETE FROM email_verifications WHERE email_blind_index = $1` | email_verifications | ✅ |

#### `auth/me/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, email, last_login_at, ... FROM users WHERE id = $1` | users | ✅ |
| 2 | `SELECT * FROM applications WHERE id = $1` | applications | ✅ (but SELECT * is wasteful) |
| 3 | `SELECT achievement_id FROM user_achievements WHERE user_id = $1` | user_achievements | ✅ |

#### `auth/send-otp/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id FROM users WHERE email_blind_index = $1` | users | ✅ |
| 2 | `SELECT 1 FROM email_verifications WHERE email_blind_index = $1` | email_verifications | ✅ |

#### `auth/verify-otp/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO email_verifications ... ON CONFLICT DO UPDATE` | email_verifications | ✅ |
| 2 | `CREATE TABLE IF NOT EXISTS email_verifications (...)` | DDL | ⚠️ DDL in API route (table already exists, this is dead code) |

#### `auth/update-profile/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `UPDATE users SET telegram_username = $1 WHERE id = $2` | users | ✅ |
| 2 | `UPDATE applications SET telegram_username = $1 WHERE id = $2` | applications | ✅ |

---

### Admin Routes

#### `admin/applications/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT a.*, u.id FROM applications a LEFT JOIN users u ... LIMIT $1 OFFSET $2` | applications, users | ✅ |
| 2 | `SELECT COUNT(*)::int FROM applications` | applications | ✅ |

#### `admin/cleanup/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `DELETE FROM user_activity WHERE created_at < NOW() - INTERVAL '90 days'` | user_activity | ✅ No params needed (hardcoded interval) |
| 2 | `DELETE FROM page_navigation WHERE entered_at < NOW() - INTERVAL '90 days'` | page_navigation | ✅ |
| 3 | `DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days'` | error_logs | ✅ |
| 4 | `DELETE FROM user_sessions WHERE started_at < NOW() - INTERVAL '90 days'` | user_sessions | ✅ |
| 5 | `DELETE FROM login_logs WHERE logged_in_at < NOW() - INTERVAL '180 days'` | login_logs | ✅ |

Note: This is the HTTP-callable version of `cleanup_old_tracking_data()`. It exists and works,
but requires `ADMIN_SECRET_TOKEN` header. The DB function is the dead one.

#### `admin/overview/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT COUNT(*) FROM users` | users | ✅ |
| 2 | `SELECT COUNT(*) FROM applications WHERE NOT EXISTS (SELECT 1 FROM users ...)` | applications, users | ✅ |
| 3 | `SELECT COUNT(*) FROM users WHERE is_shadow_banned = true` | users | ✅ |
| 4 | Submissions per day (UNION ALL training_submissions + cf_submissions) | both | ⚠️ String interpolation for interval: `INTERVAL '${seriesInterval}'` — but value comes from a whitelist, so safe |
| 5 | Cumulative users by day | users | ⚠️ Correlated subquery per day — O(n²) but small dataset |
| 6 | Active users by day (UNION ALL) | both submission tables | ⚠️ Same UNION pattern |
| 7 | New users by day | users | ✅ |
| 8 | Verdict breakdown (UNION ALL) | both submission tables | ⚠️ Same UNION pattern |
| 9 | Top sheets with activity count | curriculum_sheets, training_submissions, cf_submissions | ⚠️ Correlated subqueries per sheet |
| 10 | Active users scalar | both submission tables | ✅ |

#### `admin/rankings/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | CTE: all solves from cf_submissions → aggregate → join users + applications | cf_submissions, users, applications | ⚠️ `${whereClause}` string interpolation — but value is from a ternary, not user input. Safe. |

#### `admin/sheet-progress/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | Unified CTE: UNION ALL training_submissions + cf_submissions → per-user stats → completions | training_submissions, cf_submissions, curriculum_sheets, curriculum_levels | ⚠️ Complex UNION with `sheet_id::text` casts |
| 2 | `SELECT COUNT(*) FROM users` | users | ✅ |

#### `admin/submissions/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | UNION ALL training_submissions + cf_submissions with NULL padding | both, users, applications, curriculum_sheets | ⚠️ 6 NULL-padded columns, `cs.id::text = ts.sheet_id::text` casts |
| 2 | `SELECT (COUNT from training_submissions) + (COUNT from cf_submissions)` | both | ✅ |

#### `admin/top-students/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | Same CTE pattern as rankings | cf_submissions, users, applications | ✅ (duplicate of rankings logic) |

#### `admin/users/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | CTE: solved_counts + sub_counts from cf_submissions → join users + applications | cf_submissions, users, applications | ✅ |
| 2 | `SELECT COUNT(*) FROM users` | users | ✅ |

---

### Codeforces Routes

#### `codeforces/save-submission/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT codeforces_handle FROM users WHERE id = $1` | users | ✅ |
| 2 | `INSERT INTO cf_submissions (...) ON CONFLICT (cf_submission_id) DO UPDATE` | cf_submissions | ✅ 16 params |
| 3 | `INSERT INTO user_progress (...) ON CONFLICT (user_id, problem_id) DO UPDATE` | user_progress | ✅ Correct upsert logic |
| 4 | `SELECT l.slug, s.slug, ... FROM curriculum_levels l JOIN curriculum_sheets s WHERE s.id::text = $1` | curriculum_levels, curriculum_sheets | ⚠️ `s.id::text = $1` cast |
| 5 | `SELECT total_problems FROM curriculum_sheets WHERE id = $1` + `COUNT(*) FROM user_progress WHERE sheet_id = $1::text` | curriculum_sheets, user_progress | ⚠️ `$1::text` cast |

#### `codeforces/report-solve/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO user_progress (...) ON CONFLICT DO UPDATE` | user_progress | ✅ Same upsert pattern |

#### `codeforces/distribution/route.ts` — GET
No DB queries. Fetches from Codeforces API only. ✅

#### `codeforces/problem-stats/route.ts` — GET
No DB queries. Fetches from Codeforces API only. ✅

#### `codeforces/submission/route.ts` — GET/POST
No DB queries. Polls Codeforces API + Scrapling Bridge. ✅

#### `codeforces/submissions/route.ts` — GET
No DB queries. Fetches from Codeforces API + Bridge. ✅

#### `codeforces/user-submissions/route.ts` — GET
No DB queries. Fetches from Codeforces API. ✅

---

### Curriculum Routes

#### `curriculum/levels/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, level_number, name, slug, ... FROM curriculum_levels ORDER BY level_number` | curriculum_levels | ✅ |

#### `curriculum/progress/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT l.slug, COUNT(p.id), COUNT(CASE WHEN up.status='SOLVED') ... LEFT JOIN user_progress ON up.problem_id = (s.contest_id::text \|\| ':' \|\| UPPER(p.problem_letter))` | curriculum_levels, curriculum_sheets, curriculum_problems, user_progress | ⚠️ String concatenation join: `s.contest_id::text \|\| ':' \|\| UPPER(p.problem_letter)` |

#### `curriculum/roadmap/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | Same pattern: `LEFT JOIN user_progress ON up.problem_id = (s.contest_id \|\| ':' \|\| p.problem_letter)` | curriculum_sheets, curriculum_levels, curriculum_problems, user_progress | ⚠️ Same string concatenation join |

---

### Judge Routes

#### `judge/submit/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO training_submissions (...) VALUES (...) RETURNING id` | training_submissions | ✅ 16 params |
| 2 | `INSERT INTO user_progress (...) ON CONFLICT DO UPDATE` | user_progress | ✅ Same upsert |
| 3 | `SELECT total_problems FROM curriculum_sheets WHERE id = $1` + `COUNT(*) FROM user_progress WHERE sheet_id = $1::text` | curriculum_sheets, user_progress | ⚠️ Same `$1::text` cast |
| 4 | `SELECT sheet_number, level_id FROM curriculum_sheets WHERE id = $1` | curriculum_sheets | ✅ |
| 5 | `SELECT level_number FROM curriculum_levels WHERE id = $1` | curriculum_levels | ✅ |

---

### Leaderboard Routes

#### `leaderboard/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | CTE: Codeforces leaderboard (same pattern as sheets leaderboard but different) | cf_submissions, users, applications | ✅ |

#### `leaderboard/sheets/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT is_shadow_banned FROM users WHERE id = $1` | users | ✅ |
| 2 | CTE: all_solves → user_stats → sub_counts → join users + applications | cf_submissions, users, applications | ⚠️ `${shadowBanClause}` string interpolation — safe (ternary, not user input) |

---

### User Routes

#### `user/dashboard-stats/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT DISTINCT problem_key FROM cf_submissions WHERE verdict = 'Accepted'` | cf_submissions | ⚠️ Full scan per user, recalculates streak (ignores user_streaks) |
| 2 | Active sheet: UNION ALL training_submissions + cf_submissions with `sheet_id::text` casts → join curriculum | both, curriculum_sheets, curriculum_levels, curriculum_problems, user_progress | ⚠️ Complex UNION + string concat join |

#### `user/streak/route.ts` — GET
No direct DB queries. Calls `getUserStreak()` which reads from `user_streaks` + `daily_solves`. ✅

#### `user/code/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT language, code, updated_at FROM user_code WHERE ... AND is_submitted = false` | user_code | ✅ |
| 2 | `SELECT value FROM user_preferences WHERE user_id = $1 AND key = $2` | user_preferences | ✅ |
| 3 | `INSERT INTO user_code ... ON CONFLICT ... WHERE is_submitted = false DO UPDATE` | user_code | ✅ Partial unique index upsert |
| 4 | `INSERT INTO user_preferences ... ON CONFLICT DO UPDATE` | user_preferences | ✅ |

#### `user/notes/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT content FROM user_notes WHERE user_id = $1 AND contest_id = $2 AND problem_index = $3` | user_notes | ✅ |
| 2 | `INSERT INTO user_notes ... ON CONFLICT DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()` | user_notes | ✅ |

#### `user/custom-tests/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT test_cases FROM user_custom_tests WHERE ...` | user_custom_tests | ✅ |
| 2 | `INSERT INTO user_custom_tests ... ON CONFLICT DO UPDATE` | user_custom_tests | ✅ |

#### `user/preferences/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT key, value FROM user_preferences WHERE user_id = $1 AND key IN (${placeholders})` | user_preferences | ⚠️ Placeholders built as `${i + 2}` without `$` prefix — **potential bug** (see §4) |
| 2 | Batch upsert: `INSERT INTO user_preferences ... VALUES ${rows.join(', ')}` | user_preferences | ⚠️ Dynamic row building with `(${idx}, ${idx+1}, ${idx+2}, NOW())` — missing `$` prefix |

#### `user/privacy/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT show_on_cf_leaderboard, ... FROM users WHERE id = $1` | users | ✅ |
| 2 | `UPDATE users SET ... WHERE id = $N` (dynamic SET clauses) | users | ✅ Whitelist approach, safe |

#### `user/refresh-cf/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT codeforces_handle FROM users WHERE id = $1` | users | ✅ |
| 2 | `UPDATE users SET codeforces_data = $1 WHERE id = $2` | users | ✅ |

#### `user/delete-profile-data/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT application_id FROM users WHERE id = $1` | users | ✅ |
| 2 | `UPDATE users SET telegram_username = NULL WHERE id = $1` | users | ✅ |
| 3 | `UPDATE applications SET telegram_username = NULL WHERE id = $1` | applications | ✅ |

#### `user/upload-pfp/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT profile_picture FROM users WHERE id = $1` | users | ✅ |
| 2 | `UPDATE users SET profile_picture = $1 WHERE id = $2` | users | ✅ |

#### `user/delete-pfp/route.ts` — DELETE
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT profile_picture FROM users WHERE id = $1` | users | ✅ |
| 2 | `UPDATE users SET profile_picture = NULL WHERE id = $1` | users | ✅ |

---

### Other Routes

#### `achievements/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, achievement_id, earned_at, seen FROM user_achievements WHERE user_id = $1` | user_achievements | ✅ |

#### `notifications/route.ts` — GET/PATCH
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT ... FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20` | notifications | ✅ |
| 2 | `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2` | notifications | ✅ |
| 3 | `UPDATE notifications SET is_read = TRUE WHERE user_id = $1` | notifications | ✅ |

#### `news/reactions/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT news_id, reaction_type, COUNT(*) FROM news_reactions WHERE news_id = ANY($1) GROUP BY ...` | news_reactions | ✅ |
| 2 | `SELECT news_id, reaction_type FROM news_reactions WHERE news_id = ANY($1) AND user_id = $2` | news_reactions | ✅ |
| 3 | Toggle CTE: `WITH deleted AS (DELETE ...) INSERT ... WHERE NOT EXISTS (SELECT 1 FROM deleted)` | news_reactions | ✅ Elegant toggle pattern |

#### `sheets/solved/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT problem_id FROM user_progress WHERE user_id = $1 AND status = 'SOLVED' AND problem_id LIKE $2` | user_progress | ✅ LIKE with parameterized prefix |

#### `submissions/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | Dynamic UNION ALL: training_submissions + cf_submissions | both | 🐛 References `ts.notes, ts.note_color, cf.notes, cf.note_color` — columns don't exist |
| 2 | `SELECT contest_id, problem_letter FROM curriculum_problems WHERE sheet_id = $1` | curriculum_problems | ✅ |

#### `submissions/[id]/route.ts` — GET/PATCH
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT ts.* FROM training_submissions ts JOIN users u ... WHERE ts.id = $1 AND ts.user_id = $2` | training_submissions, users | ✅ |
| 2 | `UPDATE training_submissions SET notes = $1, note_color = $2 WHERE id = $3 AND user_id = $4` | training_submissions | 🐛 `notes`, `note_color` don't exist |
| 3 | `UPDATE cf_submissions SET notes = $1, note_color = $2 WHERE id = $3 AND user_id = $4` | cf_submissions | 🐛 Same |

#### `analytics/problem-stats/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT time_ms, memory_kb FROM cf_submissions WHERE contest_id = $1 AND problem_index = $2 AND verdict = 'Accepted'` | cf_submissions | ✅ |
| 2 | Same + `AND user_id = $1` | cf_submissions | ✅ |

#### `stats/distribution/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT user_id, time_ms, memory_kb FROM training_submissions WHERE sheet_id = $1 AND problem_id = $2 AND verdict = 'Accepted'` | training_submissions | ✅ |

#### `views/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | CTE: INSERT view_logs → upsert page_views → return count | view_logs, page_views | ✅ Elegant single-query pattern |
| 2 | `SELECT COUNT(DISTINCT entity_id) FROM view_logs WHERE user_id = $1 AND entity_type = 'session' AND entity_id IN (...)` | view_logs | ✅ |

#### `video/rate/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT COUNT(*) FILTER (WHERE rating = 1) ... FROM video_ratings WHERE ...` | video_ratings | ✅ |
| 2 | `SELECT rating FROM video_ratings WHERE ... AND user_id = $3` | video_ratings | ✅ |
| 3 | `DELETE FROM video_ratings WHERE ...` | video_ratings | ✅ |
| 4 | `INSERT INTO video_ratings ... ON CONFLICT DO UPDATE` | video_ratings | ✅ |

#### `profile/[studentId]/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, role, profile_visibility, ... FROM users WHERE email_blind_index = $1` | users | ✅ |
| 2 | `SELECT name, faculty, ..., leetcode_profile, ... FROM applications WHERE id = $1` | applications | 🐛 `leetcode_profile` doesn't exist |
| 3 | `SELECT achievement_id FROM user_achievements WHERE user_id = (SELECT id FROM users WHERE email_blind_index = $1)` | user_achievements, users | ✅ |

#### `recap/[id]/route.ts` — GET
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT ... FROM recap_2025 WHERE student_id = $1` | recap_2025 | ✅ |

#### `team/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO team_registrations (...31 columns...) VALUES ($1...$31)` | team_registrations | ✅ 31 params, fully parameterized |

#### `submit-application/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO applications (..., leetcode_profile, ...) VALUES (...)` | applications | 🐛 `leetcode_profile` doesn't exist |
| 2 | `UPDATE applications SET scraping_status = 'not_applicable' WHERE id = $1` | applications | ✅ |

#### `track/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO error_logs (...) VALUES (...)` (via dynamic import) | error_logs | ✅ |
| 2 | `UPDATE user_sessions SET ..., utm_source = $10, ... WHERE ...` | user_sessions | 🐛 UTM columns don't exist |
| 3 | Events pushed to Redis buffer → flushed to `user_activity` | user_activity (via track-buffer) | ✅ |

#### `track/navigation/route.ts` — POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `UPDATE page_navigation SET left_at = NOW(), time_spent_ms = $1 WHERE ... LIMIT 1` | page_navigation | ⚠️ `ORDER BY ... LIMIT 1` in UPDATE — Postgres doesn't support this syntax. Should use subquery. |
| 2 | `INSERT INTO page_navigation (...) VALUES (...)` | page_navigation | ✅ |
| 3 | `INSERT INTO user_sessions ... ON CONFLICT DO UPDATE` | user_sessions | ✅ |

#### `track/flush/route.ts` — POST
No direct queries. Calls `flushEvents()` which batch-inserts into `user_activity`. ✅

#### `workspace/sync/route.ts` — GET/POST
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT ... FROM user_workspaces WHERE ...` | user_workspaces | 🐛 Table doesn't exist |
| 2 | `INSERT INTO user_workspaces ... ON CONFLICT DO UPDATE` | user_workspaces | 🐛 Table doesn't exist |

#### `health/route.ts` — GET
No DB queries. Returns `{ status: 'ok' }`. ✅

#### `get-ip/route.ts` — GET
No DB queries. Returns client IP. ✅

#### `analyze-complexity/route.ts` — POST
No DB queries. Calls external AI API. ✅

---

### Service Files

#### `lib/services/streaks.ts`
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO daily_solves ... ON CONFLICT DO UPDATE SET solve_count = solve_count + 1` | daily_solves | ✅ |
| 2 | `SELECT current_streak, last_solve_date FROM user_streaks WHERE user_id = $1 FOR UPDATE` | user_streaks | ✅ Row-level lock |
| 3 | `INSERT INTO user_streaks (...) VALUES (...)` | user_streaks | ✅ |
| 4 | `UPDATE user_streaks SET current_streak = $1, max_streak = GREATEST(max_streak, $1), ...` | user_streaks | ✅ |
| 5 | `SELECT current_streak, max_streak, last_solve_date FROM user_streaks WHERE user_id = $1` | user_streaks | ✅ |
| 6 | `SELECT solve_count FROM daily_solves WHERE user_id = $1 AND solve_date = $2` | daily_solves | ✅ |

#### `lib/services/achievements.ts`
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `INSERT INTO user_achievements ... WHERE EXISTS (SELECT 1 FROM users WHERE ... AND is_shadow_banned = FALSE)` | user_achievements, users | ✅ Anti-cheat check |
| 2 | `INSERT INTO notifications (...) VALUES (...)` | notifications | ✅ |
| 3 | `SELECT pg_advisory_xact_lock(202603)` | — | ✅ Advisory lock |
| 4 | Leaderboard CTE (same pattern) | cf_submissions, users | ⚠️ 5th place this pattern appears |
| 5 | `SELECT user_id FROM user_achievements WHERE achievement_id = $1 FOR UPDATE` | user_achievements | ✅ |
| 6 | `INSERT INTO leaderboard_rank1_history (...) VALUES (...)` | leaderboard_rank1_history | ✅ |
| 7 | `DELETE FROM user_achievements WHERE achievement_id = $1` | user_achievements | ✅ |
| 8 | `INSERT INTO user_achievements (...) VALUES (...)` | user_achievements | ✅ |

#### `lib/services/track-buffer.ts`
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | Batch INSERT into `user_activity` (dynamic multi-row) | user_activity | ✅ Parameterized, 10 params per row |

#### `lib/auth/auth.ts`
| # | Query | Tables | Status |
|---|---|---|---|
| 1 | `SELECT id, email, application_id, role FROM users WHERE supabase_uid = $1` | users | ✅ |

---

## 3. Cross-Cutting Patterns

### Pattern: String `problem_id` Format (7 routes)
These routes construct or parse the `"contestId:problemLetter"` string format:
- `codeforces/save-submission` — writes `${contestId}:${problemIndex.toUpperCase()}`
- `codeforces/report-solve` — writes same format with fallback
- `judge/submit` — writes `${contestIdForProgress}:${problemId}` or `${sheetId}:${problemId}`
- `curriculum/progress` — reads via `s.contest_id::text || ':' || UPPER(p.problem_letter)`
- `curriculum/roadmap` — reads via `s.contest_id || ':' || p.problem_letter`
- `sheets/solved` — reads via `problem_id LIKE '${contestId}:%'`
- `codeforces/save-submission` — reads via `sheet_id = $1::text`

### Pattern: UNION ALL of Dual Submission Tables (8 routes)
- `submissions/route.ts` — full UNION with 6 NULL-padded columns
- `user/dashboard-stats` — `sheet_id::text` UNION for active sheet
- `admin/overview` — submissions per day, active users, verdict breakdown (3 UNIONs)
- `admin/sheet-progress` — unified CTE
- `admin/submissions` — full UNION with NULL padding + joins
- `admin/overview` — active users scalar

### Pattern: Leaderboard CTE from Raw Submissions (5 places)
- `leaderboard/sheets/route.ts`
- `leaderboard/route.ts`
- `admin/users/route.ts`
- `admin/rankings/route.ts` + `admin/top-students/route.ts`
- `lib/services/achievements.ts` (syncRank1Achievement)

### Pattern: `sheet_id::text` Type Casts (6 routes)
- `user/dashboard-stats` — `SELECT sheet_id::text`
- `admin/sheet-progress` — `cs.id::text = pu.sheet_id`
- `admin/submissions` — `cs.id::text = ts.sheet_id::text`
- `codeforces/save-submission` — `s.id::text = $1`, `sheet_id = $1::text`
- `judge/submit` — `sheet_id = $1::text`
- `admin/overview` — `s.id::text`

---

## 4. SQL Injection Analysis

### All Queries Use Parameterized Queries ✅

Every single query in the codebase uses `$1, $2, ...` parameterized placeholders via the `pg`
library's `query(text, params)` interface. No raw string concatenation of user input into SQL.

### String Interpolation in SQL (Safe)

A few admin routes use string interpolation for intervals:
```typescript
const seriesInterval = SERIES_MAP[range] || '7 days';
// ...
`WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'`
```
These are safe because `seriesInterval` comes from a hardcoded whitelist (`SERIES_MAP`), not user input.

The `admin/rankings` route uses `${whereClause}` which is a ternary between two hardcoded strings.

### Potential Issue: `preferences/route.ts` Placeholder Format

```typescript
const placeholders = keys.map((_, i) => `${i + 2}`).join(', ');
// Produces: "2, 3, 4" instead of "$2, $3, $4"
```
This is missing the `$` prefix. The query becomes:
```sql
SELECT key, value FROM user_preferences WHERE user_id = $1 AND key IN (2, 3, 4)
```
Instead of:
```sql
SELECT key, value FROM user_preferences WHERE user_id = $1 AND key IN ($2, $3, $4)
```
This would match integer values 2, 3, 4 instead of the actual key strings. The query would
return no results (keys are strings like `"lang:219158:A"`). **This is a bug, not a security
issue** — it fails safely by returning empty results.

The POST endpoint has a similar pattern with `(${idx}, ${idx+1}, ${idx+2}, NOW())` — also
missing `$` prefixes. This would cause the INSERT to fail with a syntax error.

**UPDATE:** On closer inspection, this may actually work in `pg` if the library auto-prepends
`$` — but standard `pg` does NOT do this. This needs testing.

---

## 5. Summary Statistics

### Query Count by Table

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|---|---|---|---|---|---|
| users | 12 | 1 | 6 | 0 | 19 |
| applications | 5 | 2 | 3 | 0 | 10 |
| cf_submissions | 10 | 1 | 1 | 0 | 12 |
| training_submissions | 5 | 1 | 1 | 1 | 8 |
| user_progress | 3 | 4 | 0 | 0 | 7 |
| user_achievements | 4 | 2 | 0 | 1 | 7 |
| user_code | 2 | 2 | 0 | 0 | 4 |
| user_preferences | 2 | 2 | 0 | 0 | 4 |
| user_notes | 1 | 1 | 0 | 0 | 2 |
| user_custom_tests | 1 | 1 | 0 | 0 | 2 |
| notifications | 1 | 2 | 2 | 0 | 5 |
| news_reactions | 2 | 1 | 0 | 1 | 4 |
| video_ratings | 2 | 1 | 0 | 1 | 4 |
| curriculum_levels | 2 | 0 | 0 | 0 | 2 |
| curriculum_sheets | 4 | 0 | 0 | 0 | 4 |
| curriculum_problems | 1 | 0 | 0 | 0 | 1 |
| user_activity | 0 | 1 | 0 | 1 | 2 |
| page_navigation | 0 | 1 | 1 | 1 | 3 |
| user_sessions | 0 | 1 | 1 | 1 | 3 |
| login_logs | 0 | 1 | 0 | 1 | 2 |
| error_logs | 0 | 1 | 0 | 1 | 2 |
| email_verifications | 1 | 1 | 0 | 1 | 3 |
| view_logs | 1 | 1 | 0 | 0 | 2 |
| page_views | 0 | 1 | 0 | 0 | 1 |
| recap_2025 | 1 | 0 | 0 | 0 | 1 |
| team_registrations | 0 | 1 | 0 | 0 | 1 |
| leaderboard_rank1_history | 0 | 1 | 0 | 0 | 1 |
| daily_solves | 1 | 1 | 0 | 0 | 2 |
| user_streaks | 2 | 1 | 1 | 0 | 4 |
| user_workspaces | 1 | 1 | 0 | 0 | 🐛 Table missing |

### Bug Summary

| Bug | Severity | Routes Affected |
|---|---|---|
| `user_workspaces` table doesn't exist | 🔴 High | workspace/sync (GET + POST) |
| `notes`, `note_color` columns missing on both submission tables | 🔴 High | submissions (GET), submissions/[id] (GET + PATCH) |
| `leetcode_profile` column missing on applications | 🔴 High | submit-application, register, profile/[studentId] |
| `utm_source/medium/campaign` columns missing on user_sessions | 🟡 Medium | track (session_start handler) |
| `track/navigation` uses `ORDER BY ... LIMIT 1` in UPDATE (invalid Postgres) | 🟡 Medium | track/navigation |
| `preferences` placeholder format may be missing `$` prefix | 🟡 Medium | user/preferences (GET + POST) |
| Dashboard stats ignores `user_streaks`, recalculates from scratch | 🟡 Medium | user/dashboard-stats |
| `cleanup_old_tracking_data()` DB function never called (but HTTP endpoint exists) | 🟢 Low | — |

### What's Right Summary

| Pattern | Count | Notes |
|---|---|---|
| Fully parameterized queries | 95+ | Zero SQL injection vectors |
| Rate limiting on every endpoint | 40+ | Redis-based, per-user and per-IP |
| Auth check on every protected route | 40+ | `verifyAuth()` with in-memory cache |
| Upsert with ON CONFLICT | 12 | Correct idempotent patterns |
| Transactional writes | 3 | Registration, streaks, rank sync |
| Advisory locks | 1 | Campaign rank sync |
| Blind index lookups | 5 | Encrypted field search |
| Fire-and-forget for non-critical writes | 6 | `.catch(() => {})` pattern |
| Redis-buffered event tracking | 1 | Batched INSERT for user_activity |
| Cache invalidation on writes | 15+ | Consistent cache busting |
