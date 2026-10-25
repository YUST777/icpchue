# API reference

Every route under `next-app/app/api`, what it does, who can call it, and whether anything in the app still calls it.

- **Access**: `public` = no login, `signed in` = any logged-in member, `mentor/staff`, `owner/admin`, or a secret/cron header.
- **Used**: how many source files outside `app/api` mention the path (website, extension, side services). `0` means nothing calls it.
- Generated from the code on 2026-10-25. Re-check before deleting: a route can be called with a computed URL that a text search misses.

## Delete candidates (nothing calls them)

- `/api/admin/applications` – Admin list of applications (old admin dashboard).
- `/api/admin/cleanup` – Deletes old tracking data (sessions, logs, activity). Secret-header job.
- `/api/admin/export/top-active` – Owner-only CSV of the most active trainees with contact details.
- `/api/admin/overview` – Admin totals: users, pending applications, submissions per day, sheet counts.
- `/api/admin/rankings` – Admin ranking of students by solves.
- `/api/admin/sheet-progress` – Admin view of progress per sheet and per user.
- `/api/admin/submissions` – Admin list of all submissions.
- `/api/admin/top-students` – Admin top students by solved count.
- `/api/admin/users` – Admin user list with solve and submission counts.
- `/api/analyze-complexity` – Sends code to Gemini to estimate time and space complexity.
- `/api/card` – Closed. Always answers that card submissions are finished.
- `/api/codeforces/report-solve` – Marks a problem as ATTEMPTED from the page (never SOLVED).
- `/api/get-ip` – Returns your IP address.
- `/api/judge/submit` – Runs your code on the judge for a sheet problem and records the submission.
- `/api/mirror/fetch` – Proxy used by the mirror service to fetch Codeforces problem content.
- `/api/recap/[id]/share` – Shareable recap image/card.
- `/api/sheets/my-submissions` – Your accepted submissions on training sheets.
- `/api/sheets/submission/[id]` – Deletes one of your sheet submissions.
- `/api/sheets/submit` – Saves a manual sheet submission.
- `/api/stats/distribution` – Distribution of accepted submissions for charts.
- `/api/submit-application` – Old application form submit.
- `/api/track/flush` – Manual flush of buffered tracking events (secret header).

Already removed today: `/api/codeforces/submit`, `/api/codeforces/submit-result`, `/api/codeforces/submission` (all depended on the deleted bridge).

Looks unused in a text search but is NOT dead: `/api/apply/level0` and `/api/apply/level1` (the apply form builds the URL as `/api/apply/${level}`) and `/api/auth/callback/codeforces` (Codeforces redirects the browser back to it after OAuth login).

Check before deleting, because outside services may call them: `/api/admin/cleanup` and `/api/track/flush` (secret-header jobs for a cron) and `/api/mirror/fetch` (called by the mirror service).

Kept on purpose even though nothing in the app calls them: `/api/cron/*` (Vercel cron), `/api/health`, `/api/achievements/[id]/seen` (called with a template string).

## achievements

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/achievements` | GET | signed in | Your badges (with serial and factory number). Also runs the "did you earn anything new" check (at most once a minute). | 3 |
| `/api/achievements/[id]/seen` | PATCH | signed in | Marks one badge as seen after its toast is shown. (Called with a template string, so the usage scan misses it; it is in use.) | 0 |
| `/api/achievements/stats` | GET | signed in | How many members hold each badge and the member total (owner account excluded). Feeds the rarity row. Cached 10 min. | 1 |

## admin

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/admin/applications` | GET | owner/admin | Admin list of applications (old admin dashboard). | 0 |
| `/api/admin/cleanup` | POST | secret header | Deletes old tracking data (sessions, logs, activity). Secret-header job. | 0 |
| `/api/admin/export/top-active` | GET | owner/admin | Owner-only CSV of the most active trainees with contact details. | 0 |
| `/api/admin/overview` | GET | owner/admin | Admin totals: users, pending applications, submissions per day, sheet counts. | 0 |
| `/api/admin/rankings` | GET | owner/admin | Admin ranking of students by solves. | 0 |
| `/api/admin/sheet-progress` | GET | owner/admin | Admin view of progress per sheet and per user. | 0 |
| `/api/admin/submissions` | GET | owner/admin | Admin list of all submissions. | 0 |
| `/api/admin/top-students` | GET | owner/admin | Admin top students by solved count. | 0 |
| `/api/admin/users` | GET | owner/admin | Admin user list with solve and submission counts. | 0 |

## analytics

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/analytics/problem-stats` | GET | signed in | Per-problem stats from our own DB: your submissions plus how everyone did. | 1 |

## analyze-complexity

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/analyze-complexity` | POST | signed in | Sends code to Gemini to estimate time and space complexity. | 0 |

## apply

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/apply/level0` | POST | public | Level 0 application form submit (calls the shared training-registration handler). | 0 |
| `/api/apply/level1` | POST | public | Legacy Level 1 application submit, kept for people who started the old flow. | 0 |

## auth

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/auth/callback/codeforces` | GET | signed in | Codeforces OAuth return: links the Codeforces account to the logged-in user. | 0 |
| `/api/auth/check-application` | POST | public | Checks whether a verified email already has an application. | 1 |
| `/api/auth/check-email` | POST | public | Registration helper: checks an email without revealing whether an account exists. | 1 |
| `/api/auth/codeforces/login` | GET | public | Starts the Codeforces OAuth login (sets state, redirects). | 4 |
| `/api/auth/forgot-password` | POST | public | Sends the password-reset email through Supabase Auth. | 1 |
| `/api/auth/login` | POST | public | Email/student-ID + password sign in. Logs the attempt. | 1 |
| `/api/auth/logout` | POST | public | Clears the session cookies. | 1 |
| `/api/auth/me` | GET | signed in | The signed-in user: profile, role, application data, badge ids. | 3 |
| `/api/auth/register` | POST | public | Creates the account after OTP check, links the application, grants Welcome. | 1 |
| `/api/auth/reset-password` | POST | public | Finishes a password recovery with the Supabase recovery token. | 1 |
| `/api/auth/send-otp` | POST | public | Sends the registration verification code by email. | 2 |
| `/api/auth/update-profile` | POST | signed in | Updates your Telegram, Codeforces and LeetCode handles. | 1 |
| `/api/auth/verify-otp` | POST | public | Checks the registration verification code (rate limited by IP and email). | 2 |

## card

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/card` | POST/GET | public | Closed. Always answers that card submissions are finished. | 0 |

## client-errors

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/client-errors` | POST | signed in | Receives browser errors from the error reporter and boundaries into the error log. | 2 |

## codeforces

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/codeforces/auto-backfill` | POST | signed in | Imports your public Codeforces history (no group contests) into progress. | 1 |
| `/api/codeforces/backfill` | POST | signed in | Imports contest histories sent by the extension, including group contests. Handle must match the linked one. | 4 |
| `/api/codeforces/backfill-plan` | GET | signed in | Builds the list of sheets/contests the extension should fetch for a full backfill. | 3 |
| `/api/codeforces/distribution` | GET | signed in | Verdict/rating distribution data for charts. | 1 |
| `/api/codeforces/known-ids` | POST | signed in | Which Codeforces submission ids are already saved for you. | 1 |
| `/api/codeforces/mirror` | GET | signed in | Fetches a Codeforces problem statement through the mirror service (cached). | 2 |
| `/api/codeforces/missing-sources` | POST | signed in | Your synced submissions that still have no source code saved. | 1 |
| `/api/codeforces/problem-stats` | GET | signed in | Solved-by counts for a Codeforces problem (cached 1 h). | 1 |
| `/api/codeforces/report-solve` | POST | signed in | Marks a problem as ATTEMPTED from the page (never SOLVED). | 0 |
| `/api/codeforces/save-submission` | POST | signed in | Saves a Codeforces submission and verdict from the extension, updates progress, streak and badges. | 1 |
| `/api/codeforces/submissions` | GET | signed in | Lists your submissions on a contest through the public API. | 1 |
| `/api/codeforces/sync-handle` | POST | signed in | Links or re-checks your Codeforces handle (a handle belongs to one account). | 2 |
| `/api/codeforces/user-submissions` | GET | signed in | Your own submissions for one problem from Codeforces user.status. | 1 |

## cron

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/cron/grant-achievements` | GET | cron secret | Daily job: gives every member the badges they earned, even if they never opened the site. | 0 |
| `/api/cron/refresh-codeforces` | GET | cron secret | Daily job: refreshes Codeforces ratings in batches. | 0 |

## curriculum

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/curriculum/details/[levelSlug]/[sheetSlug]` | GET | signed in | A sheet with all its problems and your status on each. | 1 |
| `/api/curriculum/levels` | GET | public | All levels (cached 1 h). | 1 |
| `/api/curriculum/problem/[levelSlug]/[sheetSlug]/[problemLetter]` | GET | public | One problem: statement, limits, links. | 3 |
| `/api/curriculum/problems/[sheetId]` | GET | public | All problems of a sheet with level and sheet info. | 1 |
| `/api/curriculum/progress` | GET | signed in | Your solved counts per level. | 1 |
| `/api/curriculum/roadmap` | GET | signed in | Your roadmap: every sheet with solved counts. | 1 |
| `/api/curriculum/sheets/[levelSlug]` | GET | signed in | All sheets of a level with your solved counts. | 1 |

## discipline

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/discipline` | GET/POST | signed in | Discipline program: read your logs / write a day; mentors read trainees. | 1 |

## get-ip

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/get-ip` | GET | signed in | Returns your IP address. | 0 |

## health

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/health` | GET | public | Health check (returns ok). | 0 |

## job

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/job/apply` | POST | public | Job application form submit (with file upload). | 1 |

## judge

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/judge/submit` | POST | signed in | Runs your code on the judge for a sheet problem and records the submission. | 0 |
| `/api/judge/test` | POST | signed in | Runs your code against sample/custom tests without saving. | 1 |

## leaderboard

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/leaderboard` | GET | public | Codeforces rating leaderboard (refreshed every 6 h). | 3 |
| `/api/leaderboard/monthly` | GET | public | Monthly top-3 podium and its winners. | 1 |
| `/api/leaderboard/sheets` | GET | signed in | Level 0 / Level 1 sheets leaderboard. | 2 |

## mentor

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/mentor/integrity` | GET | mentor/staff | Matching-code and pasted-code cases for mentors. | 3 |
| `/api/mentor/integrity/code` | GET | mentor/staff | Both students code for one problem (mentor). | 1 |
| `/api/mentor/integrity/student/[id]` | GET | mentor/staff | Code matches and pasted code for one trainee (mentor). | 1 |
| `/api/mentor/trainee/[id]` | GET | mentor/staff | Full dossier of one trainee for mentors. | 2 |
| `/api/mentor/trainees` | GET | mentor/staff | Mentor trainee list with filters, groups and stats (cached 30 s). | 1 |

## mentor-group

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/mentor-group` | GET/POST | signed in | Your mentor WhatsApp group for the season; records link opens. | 2 |

## mirror

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/mirror/fetch` | POST | signed in | Proxy used by the mirror service to fetch Codeforces problem content. | 0 |

## news

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/news/reactions` | GET/POST | signed in | Reactions on news posts. | 1 |

## notifications

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/notifications` | GET/PATCH | signed in | Your bell: list notifications, mark one or all as read. | 1 |

## profile

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/profile/[studentId]` | GET | public | Public profile data by student ID (respects privacy settings). | 1 |
| `/api/profile/socials` | PUT | signed in | Saves your social links. | 1 |

## recap

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/recap/[id]` | GET | public | 2025 recap data for a student. | 2 |
| `/api/recap/[id]/share` | GET | public | Shareable recap image/card. | 0 |

## sheets

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/sheets/my-submissions` | GET | signed in | Your accepted submissions on training sheets. | 0 |
| `/api/sheets/solved` | GET | signed in | List of problem ids you solved in a sheet. | 1 |
| `/api/sheets/submission/[id]` | DELETE | signed in | Deletes one of your sheet submissions. | 0 |
| `/api/sheets/submit` | POST | signed in | Saves a manual sheet submission. | 0 |

## stats

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/stats/distribution` | GET | signed in | Distribution of accepted submissions for charts. | 0 |

## submissions

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/submissions` | GET | signed in | Your submissions list with filters. | 6 |
| `/api/submissions/[id]` | GET/PATCH | signed in | One submission (get, or update its note/source). | 6 |
| `/api/submissions/cf/[id]` | GET/PATCH | signed in | Stores or reads the source code of a Codeforces submission (owner only). | 3 |
| `/api/submissions/verify` | POST | signed in | Checks that a Codeforces submission is accepted and marks the problem solved. | 1 |

## submit-application

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/submit-application` | POST | public | Old application form submit. | 0 |

## team

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/team` | POST | public | Team registration form submit (ECPC team). | 1 |

## track

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/track` | POST | signed in | Event tracking (UI actions, errors). | 5 |
| `/api/track/flush` | POST | public | Manual flush of buffered tracking events (secret header). | 0 |
| `/api/track/navigation` | POST | signed in | Page visit and session activity tracking. | 1 |
| `/api/track/session-watch` | POST | signed in | Heartbeat for session pages: video watch time, page time. | 1 |
| `/api/track/time` | POST | signed in | Active/idle/away seconds on a problem page. | 1 |

## user

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/user/code` | GET/POST | signed in | Saves and loads your code per problem and language. | 2 |
| `/api/user/custom-tests` | GET/POST | signed in | Your saved custom test cases. | 1 |
| `/api/user/dashboard-stats` | GET | signed in | Dashboard numbers: solved, streak, current sheet. | 1 |
| `/api/user/delete-pfp` | DELETE | signed in | Deletes your profile picture. | 1 |
| `/api/user/delete-profile-data` | POST | signed in | Removes Telegram or Codeforces data from your profile. | 1 |
| `/api/user/notes` | GET/POST | signed in | Your notes per problem. | 1 |
| `/api/user/preferences` | GET/POST | signed in | Your saved UI preferences. | 2 |
| `/api/user/privacy` | GET/POST | signed in | Your privacy settings (profile visibility, leaderboard). | 1 |
| `/api/user/refresh-cf` | POST | signed in | Refreshes your Codeforces rating data now. | 2 |
| `/api/user/streak` | GET | signed in | Your current streak. | 1 |
| `/api/user/upload-pfp` | POST | signed in | Uploads a profile picture. | 1 |

## video

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/video/rate` | GET/POST | signed in | Like/dislike counts and your vote for a session video. | 1 |

## views

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/views` | POST | signed in | Page-view counter. | 2 |

## workspace

| Route | Methods | Access | What it does | Used |
|---|---|---|---|---|
| `/api/workspace/sync` | GET/POST | signed in | Syncs your editor workspace. | 1 |
