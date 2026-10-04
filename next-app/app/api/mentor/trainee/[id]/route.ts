import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyMentor } from '@/lib/auth/auth';
import { decrypt, createBlindIndex } from '@/lib/security/encryption';
import { parseCodeforcesUrl } from '@/lib/services/codeforces-backfill';

interface CacheEntry {
    data: any;
    expiresAt: number;
}

const dossierCache = new Map<string, CacheEntry>();
const DOSSIER_CACHE_MAX = 200;

type ProblemStatus = 'SOLVED' | 'WRONG_ANSWER' | 'TIME_LIMIT' | 'MEMORY_LIMIT' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'ATTEMPTED' | 'NOT_STARTED';

/** Classify a stored verdict by its start, not by loose substrings ("wa" in "waiting"). */
function classifyVerdict(raw: string | null | undefined): { status: ProblemStatus; label: string } {
    const v = String(raw || '').trim();
    const l = v.toLowerCase();
    if (/^(ok|ac|accepted|happy new year|perfect result)/.test(l)) return { status: 'SOLVED', label: 'Accepted' };
    if (/^(wrong answer|wa\b)/.test(l)) return { status: 'WRONG_ANSWER', label: v };
    if (/^(time limit|tle\b)/.test(l)) return { status: 'TIME_LIMIT', label: 'Time Limit Exceeded' };
    if (/^(memory limit|mle\b)/.test(l)) return { status: 'MEMORY_LIMIT', label: 'Memory Limit Exceeded' };
    if (/^(runtime error|rte\b|re\b)/.test(l)) return { status: 'RUNTIME_ERROR', label: 'Runtime Error' };
    if (/^(compilation error|ce\b)/.test(l)) return { status: 'COMPILATION_ERROR', label: 'Compilation Error' };
    return { status: 'ATTEMPTED', label: v || 'Attempted' };
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const mentorUser = await verifyMentor(req);
        if (!mentorUser) {
            return NextResponse.json({ error: 'Unauthorized: Mentor access required' }, { status: 403 });
        }

        const resolvedParams = await context.params;
        const rawParam = resolvedParams?.id;
        if (!rawParam) {
            return NextResponse.json({ error: 'Student identifier required' }, { status: 400 });
        }

        const paramId = decodeURIComponent(rawParam).trim();

        const url = new URL(req.url);
        const rawOffset = parseInt(url.searchParams.get('sub_offset') || '0', 10);
        const rawLimit = parseInt(url.searchParams.get('sub_limit') || '100', 10);
        const subOffset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
        const subLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;

        // The role is part of the key: mentors must never receive a staff dossier
        // that an owner's request cached a moment earlier.
        const cacheKey = `dossier:${mentorUser.role}:${paramId.toLowerCase().trim()}:${subOffset}:${subLimit}`;
        const cached = dossierCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json(cached.data, {
                headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=30' }
            });
        }

        // 1. Locate User by Numeric ID, STU-<id>, CF Handle, Blind Index, or Decrypted values
        let userRow: any = null;
        let appRow: any = null;

        let candidateUserId: string | null = null;
        const appMatch = paramId.match(/^app-(\d+)$/i);
        if (appMatch) {
            const byApp = await query('SELECT * FROM applications WHERE id = $1 LIMIT 1', [appMatch[1]]);
            if (byApp.rows.length > 0) {
                appRow = byApp.rows[0];
                const uRes = await query('SELECT * FROM users WHERE application_id = $1 ORDER BY id DESC LIMIT 1', [appRow.id]);
                if (uRes.rows.length > 0) userRow = uRes.rows[0];
            }
        } else if (/^\d+$/.test(paramId)) {
            candidateUserId = paramId;
        } else {
            const stuMatch = paramId.match(/^STU-(\d+)$/i);
            if (stuMatch) candidateUserId = stuMatch[1];
        }

        if (candidateUserId) {
            const byUserId = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [candidateUserId]);
            if (byUserId.rows.length > 0) {
                userRow = byUserId.rows[0];
            } else {
                const byAppStudentId = await query('SELECT * FROM applications WHERE student_id = $1 LIMIT 1', [candidateUserId]);
                if (byAppStudentId.rows.length > 0) {
                    appRow = byAppStudentId.rows[0];
                    const uRes = await query(
                        'SELECT * FROM users WHERE application_id = $1 OR email_blind_index = $2 OR (email = $3 AND $3 IS NOT NULL) LIMIT 1', 
                        [appRow.id, appRow.email_blind_index, appRow.email]
                    );
                    if (uRes.rows.length > 0) userRow = uRes.rows[0];
                }
            }
        }

        if (!userRow && !appRow) {
            const bi = createBlindIndex(paramId);
            const [byHandle, byBlindIndex] = await Promise.all([
                query('SELECT * FROM users WHERE LOWER(codeforces_handle) = LOWER($1) LIMIT 1', [paramId]),
                bi ? query('SELECT * FROM applications WHERE student_id_blind_index = $1 OR email_blind_index = $1 LIMIT 1', [bi]) : Promise.resolve({ rows: [] })
            ]);

            if (byHandle.rows.length > 0) {
                userRow = byHandle.rows[0];
            } else if (byBlindIndex.rows.length > 0) {
                appRow = byBlindIndex.rows[0];
                const uRes = await query(
                    'SELECT * FROM users WHERE application_id = $1 OR email_blind_index = $2 OR (email = $3 AND $3 IS NOT NULL) LIMIT 1', 
                    [appRow.id, appRow.email_blind_index, appRow.email]
                );
                if (uRes.rows.length > 0) userRow = uRes.rows[0];
            }
        }

        if (!userRow && !appRow) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const userId = userRow?.id ?? null;
        const applicationId = userRow?.application_id || appRow?.id || null;

        // Mentors may inspect trainees only. Instructor/owner roles can still
        // use the dossier for staff support, but one mentor must not pivot from
        // the trainee list into another mentor/admin's private dossier by
        // guessing an ID.
        if (mentorUser.role === 'mentor' && userRow?.role &&
            ['mentor', 'instructor', 'owner'].includes(String(userRow.role))) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        if (!appRow && applicationId) {
            const appRes = await query('SELECT * FROM applications WHERE id = $1 LIMIT 1', [applicationId]);
            if (appRes.rows.length > 0) appRow = appRes.rows[0];
        }

        // 2. Profile Details
        const profile = {
            id: userId || applicationId,
            user_id: userId,
            application_id: applicationId,
            name: decrypt(appRow?.name) || userRow?.codeforces_handle || `Student #${userId || applicationId}`,
            student_id: appRow?.student_id || `STU-${userId || applicationId}`,
            email: decrypt(appRow?.email) || decrypt(userRow?.email) || userRow?.email || '',
            phone: decrypt(appRow?.telephone) || '',
            telegram: appRow?.telegram_username || userRow?.telegram_username || '',
            faculty: appRow?.faculty || '',
            academic_level: appRow?.student_level || '',
            training_level: (String(appRow?.application_type || '').match(/^level(\d)_training_/) || [])[1] ?? null,
            has_laptop: appRow?.has_laptop ?? null,
            codeforces_handle: userRow?.codeforces_handle || '',
            codeforces_profile: appRow?.codeforces_profile || '',
            leetcode_profile: appRow?.leetcode_profile || '',
            profile_picture: null,
            created_at: userRow?.created_at || appRow?.submitted_at,
            last_login_at: userRow?.last_login_at || null,
            cheating_flags: userRow?.cheating_flags || 0,
            is_shadow_banned: userRow?.is_shadow_banned || false,
            season_year: appRow?.season_year || null,
        };

        // 3. Parallel Fetching with Verified Schema
        const [
            statsRes,
            streakRes,
            recapRes,
            totalProblemsRes,
            sheetsRes,
            allCurriculumProblemsRes,
            userProgressRes,
            heatmapRes,
            subsRes,
            subsCountRes,
            allUserCodesRes,
            allUserNotesRes,
            customTestsRes,
            sumTimeRes,
            problemVerdictsRes
        ] = await Promise.all([
            userId ? query(`
                SELECT
                    (SELECT COUNT(DISTINCT problem_id) FROM user_progress WHERE user_id = $1 AND status = 'SOLVED') AS distinct_solved,
                    (SELECT COUNT(DISTINCT (COALESCE(contest_id::text, sheet_id::text, ''), UPPER(problem_index)))
                       FROM submissions WHERE user_id = $1 AND verdict IN ('Accepted', 'OK')) AS distinct_ac,
                    (SELECT MAX(submitted_at) FROM submissions WHERE user_id = $1 AND verdict IN ('Accepted', 'OK')) AS last_solve_at,
                    (SELECT COUNT(*) FROM submissions WHERE user_id = $1 AND submitted_at > now() - interval '7 days') AS subs_7d
            `, [userId]) : Promise.resolve({ rows: [] }),
            userId ? query('SELECT * FROM user_streaks WHERE user_id = $1 LIMIT 1', [userId]) : Promise.resolve({ rows: [] }),
            Promise.resolve({ rows: [] }),
            query('SELECT COUNT(*) as count FROM curriculum_problems'),
            query(`
                SELECT 
                    cs.id, 
                    cs.sheet_number, 
                    cs.sheet_letter, 
                    cs.name, 
                    cs.total_problems, 
                    cs.contest_id,
                    cs.level_id,
                    cl.level_number,
                    cl.name as level_name
                FROM curriculum_sheets cs
                LEFT JOIN curriculum_levels cl ON cs.level_id = cl.id
                ORDER BY cl.level_number ASC NULLS LAST, cs.sheet_number ASC, cs.id ASC
            `),
            query(`
                SELECT id, sheet_id, problem_number, problem_letter, title, contest_id, codeforces_url, rating
                FROM curriculum_problems
                ORDER BY sheet_id ASC, problem_number ASC, problem_letter ASC
            `),
            userId ? query('SELECT sheet_id, problem_id, status FROM user_progress WHERE user_id = $1', [userId]) : Promise.resolve({ rows: [] }),
            userId ? query(`
                SELECT to_char(solve_date, 'YYYY-MM-DD') AS solve_date, solve_count 
                FROM daily_solves 
                WHERE user_id = $1 AND solve_date >= CURRENT_DATE - INTERVAL '365 days'
                ORDER BY solve_date ASC
            `, [userId]) : Promise.resolve({ rows: [] }),
            userId ? query(`
                WITH ranked_subs AS (
                    SELECT 
                        id, contest_id, problem_index, sheet_id, verdict, details,
                        language, time_ms, memory_kb, submitted_at, 
                        time_to_solve_seconds, paste_events, tab_switches, 
                        cf_submission_id, source_code,
                        ROW_NUMBER() OVER (
                            PARTITION BY user_id, contest_id, problem_index 
                            ORDER BY submitted_at ASC NULLS LAST, cf_submission_id ASC NULLS LAST, id ASC
                        ) as real_attempt
                    FROM submissions 
                    WHERE user_id = $1
                )
                SELECT * FROM ranked_subs 
                ORDER BY submitted_at DESC NULLS LAST, cf_submission_id DESC NULLS LAST, id DESC
                LIMIT $2 OFFSET $3
            `, [userId, subLimit, subOffset]) : Promise.resolve({ rows: [] }),
            userId ? query('SELECT COUNT(*) as total FROM submissions WHERE user_id = $1', [userId]) : Promise.resolve({ rows: [{ total: '0' }] }),
            userId ? query(`
                SELECT contest_id, problem_id, code, language, updated_at 
                FROM user_code 
                WHERE user_id = $1 
                ORDER BY updated_at DESC 
                LIMIT 150
            `, [userId]) : Promise.resolve({ rows: [] }),
            userId ? query(`
                SELECT id, contest_id, problem_index, content, updated_at 
                FROM user_notes 
                WHERE user_id = $1 
                ORDER BY updated_at DESC 
                LIMIT 100
            `, [userId]) : Promise.resolve({ rows: [] }),
            Promise.resolve({ rows: [] }),
            userId ? query('SELECT SUM(time_to_solve_seconds) as total_sec FROM submissions WHERE user_id = $1', [userId]) : Promise.resolve({ rows: [{ total_sec: '0' }] }),
            userId ? query(`
                SELECT 
                    contest_id, 
                    problem_index, 
                    COUNT(*) as total_attempts,
                    BOOL_OR(LOWER(verdict) LIKE '%accepted%' OR LOWER(verdict) = 'ok' OR LOWER(verdict) = 'ac') as has_ac,
                    (ARRAY_AGG(verdict ORDER BY submitted_at DESC NULLS LAST, cf_submission_id DESC NULLS LAST, id DESC))[1] as latest_verdict
                FROM submissions 
                WHERE user_id = $1 
                GROUP BY contest_id, problem_index
            `, [userId]) : Promise.resolve({ rows: [] })
        ]);

        // Same source as the directory (user_progress SOLVED), falling back to
        // distinct accepted problems for users whose progress was never synced.
        const distinctSolved = Math.max(
            parseInt(statsRes.rows[0]?.distinct_solved || '0', 10),
            parseInt(statsRes.rows[0]?.distinct_ac || '0', 10),
        );
        const totalSubmissions = parseInt(subsCountRes.rows[0]?.total || statsRes.rows[0]?.total_submissions || '0', 10);
        const currentStreak = parseInt(streakRes.rows[0]?.current_streak || '0', 10);
        const maxStreak = parseInt(streakRes.rows[0]?.max_streak || '0', 10);
        const lastSolveAt = statsRes.rows[0]?.last_solve_at || streakRes.rows[0]?.last_solve_date;
        const totalProblems = parseInt(totalProblemsRes.rows[0]?.count || '150', 10);

        // Build Sheet and Contest Lookup Maps
        const contestToSheetMap = new Map<string, { level: string, level_id: string, sheet_letter: string, sheet_name: string, sheet_id: string }>();
        const sheetIdToSheetMap = new Map<string, { level: string, level_id: string, sheet_letter: string, sheet_name: string, sheet_id: string }>();

        sheetsRes.rows.forEach((s: any) => {
            const lvlId = String(s.level_number ?? s.level_id ?? '');
            const info = {
                level: `Lv ${lvlId}`,
                level_id: lvlId,
                sheet_letter: s.sheet_letter || `Sheet ${s.sheet_number}`,
                sheet_name: s.name || '',
                sheet_id: String(s.id),
            };
            sheetIdToSheetMap.set(String(s.id), info);
            if (s.contest_id) contestToSheetMap.set(String(s.contest_id), info);
        });

        // Build precise problem solved/attempted Sets with safe split guards
        const solvedSet = new Set<string>();
        const attemptedSet = new Set<string>();

        userProgressRes.rows.forEach((p: any) => {
            const sheetIdStr = String(p.sheet_id);
            const raw = String(p.problem_id || '').trim();
            if (!raw || raw === 'null' || raw === 'undefined') return;

            const isSolved = p.status === 'SOLVED';
            const targetSet = isSolved ? solvedSet : (p.status === 'ATTEMPTED' ? attemptedSet : null);
            if (!targetSet) return;

            targetSet.add(`${sheetIdStr}_${raw}`);
            if (raw.includes(':')) {
                const parts = raw.split(':');
                const cid = parts[0]?.trim();
                const letter = parts[1]?.trim()?.toUpperCase();
                if (letter) {
                    targetSet.add(`${sheetIdStr}_${letter}`);
                    if (cid) targetSet.add(`cid_${cid}_${letter}`);
                }
            } else if (/^[A-Za-z0-9]+$/.test(raw)) {
                targetSet.add(`${sheetIdStr}_${raw.toUpperCase()}`);
            }
        });

        // Map submissions verdicts by contest_id + problem_index
        const probSubMap = new Map<string, { total_attempts: number, has_ac: boolean, latest_verdict: string }>();
        problemVerdictsRes.rows?.forEach((row: any) => {
            if (row.contest_id && row.problem_index) {
                const key = `${row.contest_id}_${row.problem_index.toUpperCase().trim()}`;
                probSubMap.set(key, {
                    total_attempts: parseInt(row.total_attempts || '1', 10),
                    has_ac: Boolean(row.has_ac),
                    latest_verdict: row.latest_verdict || '',
                });
            }
        });

        // Group curriculum problems strictly by sheet_id
        const problemsBySheetId = new Map<string, any[]>();
        const problemTitleMap = new Map<string, string>();
        const canonicalContestBySheetId = new Map<string, string>();
        sheetsRes.rows.forEach((sheet: any) => {
            if (sheet.contest_id) canonicalContestBySheetId.set(String(sheet.id), String(sheet.contest_id));
        });

        allCurriculumProblemsRes.rows.forEach((prob: any) => {
            const sheetIdStr = String(prob.sheet_id);
            if (!problemsBySheetId.has(sheetIdStr)) problemsBySheetId.set(sheetIdStr, []);

            const letter = (prob.problem_letter || '').toUpperCase().trim();
            const canonicalContestId = parseCodeforcesUrl(prob.codeforces_url)?.contestId ||
                (prob.contest_id ? String(prob.contest_id) : canonicalContestBySheetId.get(sheetIdStr) || '');
            const sheetInfo = sheetIdToSheetMap.get(sheetIdStr);
            if (canonicalContestId && sheetInfo && !contestToSheetMap.has(canonicalContestId)) {
                contestToSheetMap.set(canonicalContestId, sheetInfo);
            }
            if (canonicalContestId && letter) {
                problemTitleMap.set(`${canonicalContestId}_${letter}`, prob.title);
            }

            const subKey = `${canonicalContestId}_${letter}`;
            const subData = probSubMap.get(subKey);

            let status: ProblemStatus = 'NOT_STARTED';
            let verdictLabel = 'Not Started';
            let attempts = 0;

            if (subData) {
                attempts = subData.total_attempts;
                const classified = subData.has_ac ? { status: 'SOLVED' as ProblemStatus, label: 'Accepted' } : classifyVerdict(subData.latest_verdict);
                status = classified.status;
                verdictLabel = classified.label;
            } else if (
                solvedSet.has(`${sheetIdStr}_${letter}`) ||
                solvedSet.has(`cid_${canonicalContestId}_${letter}`) ||
                solvedSet.has(`${sheetIdStr}_${prob.id}`)
            ) {
                status = 'SOLVED';
                verdictLabel = 'Accepted';
                attempts = 1;
            } else if (
                attemptedSet.has(`${sheetIdStr}_${letter}`) ||
                attemptedSet.has(`cid_${canonicalContestId}_${letter}`) ||
                attemptedSet.has(`${sheetIdStr}_${prob.id}`)
            ) {
                status = 'ATTEMPTED';
                verdictLabel = 'Attempted';
                attempts = 1;
            }

            problemsBySheetId.get(sheetIdStr)!.push({
                id: prob.id,
                problem_number: prob.problem_number,
                problem_letter: prob.problem_letter,
                title: prob.title,
                contest_id: canonicalContestId || prob.contest_id,
                rating: prob.rating,
                status: status,
                verdict: verdictLabel,
                attempts: attempts,
            });
        });

        let totalAttempted = 0;
        const sheetProgressList = sheetsRes.rows.map((s: any) => {
            const sheetIdStr = String(s.id);
            const sheetProblems = problemsBySheetId.get(sheetIdStr) || [];
            
            const solvedCount = sheetProblems.filter(pr => pr.status === 'SOLVED').length;
            const attemptedCount = sheetProblems.filter(pr => pr.status !== 'SOLVED' && pr.status !== 'NOT_STARTED').length;
            const sheetTotal = sheetProblems.length || s.total_problems || 26;
            const notStarted = Math.max(0, sheetTotal - (solvedCount + attemptedCount));
            totalAttempted += attemptedCount;
            const pct = Math.min(100, Math.round((solvedCount / (sheetTotal || 1)) * 100));

            return {
                id: s.id,
                sheet_number: s.sheet_number,
                sheet_letter: s.sheet_letter || `Sheet ${s.sheet_number}`,
                name: s.name,
                level_id: s.level_id,
                level_number: s.level_number ?? null,
                level_name: s.level_name || (s.level_number != null ? `Level ${s.level_number}` : ''),
                contest_id: s.contest_id,
                total_problems: sheetTotal,
                solved: solvedCount,
                attempted: attemptedCount,
                not_started: notStarted,
                percentage: pct,
                problems: sheetProblems,
            };
        });

        const notStartedTotal = Math.max(0, totalProblems - (distinctSolved + totalAttempted));
        const solvedPct = totalProblems > 0 ? Math.min(100, Math.round((distinctSolved / totalProblems) * 100)) : 0;
        const attemptedPct = totalProblems > 0 ? Math.min(100, Math.round((totalAttempted / totalProblems) * 100)) : 0;
        const notStartedPct = totalProblems > 0 ? Math.max(0, 100 - (solvedPct + attemptedPct)) : 0;

        // Calculate Practice Time and 7-day activity
        let totalSec = parseInt(sumTimeRes.rows[0]?.total_sec || '0', 10);
        const subTimestamps = subsRes.rows
            .map((r: any) => new Date(r.submitted_at).getTime())
            .filter((t: number) => !isNaN(t))
            .sort((a: number, b: number) => a - b);

        if (totalSec <= 0 && subTimestamps.length > 0) {
            let totalSessionMs = 0;
            let sessionStart = subTimestamps[0];
            let lastTime = subTimestamps[0];
            const SESSION_GAP_MS = 45 * 60 * 1000; // 45 mins

            for (let i = 1; i < subTimestamps.length; i++) {
                const t = subTimestamps[i];
                if (t - lastTime > SESSION_GAP_MS) {
                    totalSessionMs += Math.max(15 * 60 * 1000, (lastTime - sessionStart) + 15 * 60 * 1000);
                    sessionStart = t;
                }
                lastTime = t;
            }
            totalSessionMs += Math.max(15 * 60 * 1000, (lastTime - sessionStart) + 15 * 60 * 1000);
            totalSec = Math.round(totalSessionMs / 1000);
        }

        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const timeSpentStr = totalSec > 0 ? `${hours}h ${mins}m` : '0h 0m';

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const subs7d = parseInt(statsRes.rows[0]?.subs_7d ?? '', 10) || subTimestamps.filter((t: number) => t >= sevenDaysAgo).length;

        // 4. Metrics Payload
        const metrics = {
            problems_solved: distinctSolved,
            solved_percentage: solvedPct,
            attempted: totalAttempted,
            attempted_percentage: attemptedPct,
            not_started: notStartedTotal,
            not_started_percentage: notStartedPct,
            current_streak: currentStreak,
            max_streak: maxStreak,
            total_submissions: totalSubmissions,
            submissions_last_7_days: subs7d,
            time_spent_seconds: totalSec,
            time_spent_str: timeSpentStr,
            last_solve_at: lastSolveAt,
            // Share of submissions that were accepted (distinct problems would mix units).
            accuracy_rate: totalSubmissions > 0 ? Math.min(100, Math.round((parseInt(statsRes.rows[0]?.distinct_ac || '0', 10) / totalSubmissions) * 100)) : 0,
        };

        // 5. Recent Submissions List
        const recentSubmissions = subsRes.rows.map((sub: any) => {
            const contestIdStr = sub.contest_id ? String(sub.contest_id) : '';
            const sheetIdStr = sub.sheet_id ? String(sub.sheet_id) : '';
            const sheetLookup = contestToSheetMap.get(contestIdStr) || sheetIdToSheetMap.get(sheetIdStr);

            const letter = (sub.problem_index || '').toUpperCase().trim();
            const titleLookup = problemTitleMap.get(`${contestIdStr}_${letter}`) || '';

            return {
                id: sub.id,
                contest_id: sub.contest_id,
                problem_index: sub.problem_index,
                problem: sub.contest_id ? `${sub.contest_id} ${sub.problem_index}` : `Problem #${sub.id}`,
                problem_title: titleLookup,
                sheet_id: sub.sheet_id,
                sheet_info: sheetLookup ? {
                    level: sheetLookup.level,
                    sheet_letter: sheetLookup.sheet_letter,
                    sheet_name: sheetLookup.sheet_name
                } : undefined,
                verdict: sub.verdict || 'Unknown',
                details: sub.details || null,
                language: sub.language || 'C++',
                time_ms: sub.time_ms ?? null,
                memory_kb: sub.memory_kb ?? null,
                attempts: parseInt(sub.real_attempt || '1', 10),
                submitted_at: sub.submitted_at,
                cf_submission_id: sub.cf_submission_id,
                source_code: sub.source_code || '',
            };
        });

        // 6. Flagged Problems Forensics
        const flaggedSubs = recentSubmissions.filter((s: any) => {
            const rawSub = subsRes.rows.find((r: any) => r.id === s.id);
            return rawSub?.paste_events > 5 || (rawSub?.time_to_solve_seconds && rawSub?.time_to_solve_seconds < 15 && rawSub?.verdict?.toLowerCase().includes('accepted'));
        });

        const flaggedProblems = flaggedSubs.map((sub: any) => {
            const rawSub = subsRes.rows.find((r: any) => r.id === sub.id);
            return {
                submission_id: sub.id,
                contest_id: sub.contest_id,
                problem_index: sub.problem_index,
                problem_title: sub.problem_title || `${sub.contest_id} ${sub.problem_index}`,
                verdict: sub.verdict,
                reason: rawSub?.paste_events > 5 ? `Excessive Paste Events (${rawSub.paste_events} pastes)` : 'Abnormally Fast Solve Time (< 15s)',
                submitted_at: sub.submitted_at,
                time_to_solve_seconds: rawSub?.time_to_solve_seconds,
                paste_events: rawSub?.paste_events || 0,
                cf_submission_id: sub.cf_submission_id,
                source_code: sub.source_code,
            };
        });

        // 7. Heatmap
        const heatmapData = heatmapRes.rows.map((row: any) => ({
            date: row.solve_date ? String(row.solve_date) : '',
            count: parseInt(row.solve_count || '0', 10),
        })).filter((d: any) => Boolean(d.date));

        // 8. Code Catalog (Deduplicated with Lv / Sheet / Letter labels, verdicts, and attempts)
        const seenCatalogKeys = new Set<string>();
        const codeCatalog: any[] = [];

        // 8a. From submissions with source_code (priority: actual evaluated code)
        subsRes.rows.forEach((s: any) => {
            const cid = String(s.contest_id || '').trim();
            const letter = String(s.problem_index || '').toUpperCase().trim();
            const comboKey = `${cid}_${letter}`;
            if (!seenCatalogKeys.has(comboKey) && s.source_code) {
                seenCatalogKeys.add(comboKey);
                const sheetInfo = contestToSheetMap.get(cid);
                const title = problemTitleMap.get(`${cid}_${letter}`);
                const displayLabel = sheetInfo 
                    ? `${sheetInfo.level} / Sheet ${sheetInfo.sheet_letter} / ${letter}` 
                    : `${cid} ${letter}`;

                const subData = probSubMap.get(comboKey);
                const hasAc = subData ? subData.has_ac : classifyVerdict(s.verdict).status === 'SOLVED';
                const classified = hasAc ? { status: 'SOLVED' as ProblemStatus, label: 'Accepted' } : classifyVerdict(subData?.latest_verdict || s.verdict);
                const verdict = classified.label;
                const status = classified.status;

                codeCatalog.push({
                    key: `sub_${comboKey}`,
                    contest_id: cid,
                    problem_id: letter,
                    display_label: displayLabel,
                    sheet_name: sheetInfo?.sheet_name,
                    problem_title: title,
                    code: s.source_code,
                    language: s.language || 'C++',
                    verdict: verdict,
                    status: status,
                    attempts: subData?.total_attempts || 1,
                    updated_at: s.submitted_at,
                });
            }
        });

        // 8b. From user_code drafts
        allUserCodesRes.rows.forEach((c: any) => {
            const cid = String(c.contest_id || '').trim();
            const letter = String(c.problem_id || '').replace(/^.*?:/, '').toUpperCase().trim();
            const comboKey = `${cid}_${letter}`;
            if (!seenCatalogKeys.has(comboKey) && c.code) {
                seenCatalogKeys.add(comboKey);
                const sheetInfo = contestToSheetMap.get(cid);
                const title = problemTitleMap.get(`${cid}_${letter}`);
                const displayLabel = sheetInfo 
                    ? `${sheetInfo.level} / Sheet ${sheetInfo.sheet_letter} / ${letter}` 
                    : `${cid} ${letter}`;

                const subData = probSubMap.get(comboKey);
                let verdict = 'Draft';
                let status = 'DRAFT';
                if (subData) {
                    if (subData.has_ac) {
                        verdict = 'Accepted';
                        status = 'SOLVED';
                    } else {
                        verdict = subData.latest_verdict || 'Attempted';
                        status = verdict.toLowerCase().includes('wrong') ? 'WRONG_ANSWER' : 'ATTEMPTED';
                    }
                }

                codeCatalog.push({
                    key: `draft_${comboKey}`,
                    contest_id: cid,
                    problem_id: letter,
                    display_label: displayLabel,
                    sheet_name: sheetInfo?.sheet_name,
                    problem_title: title,
                    code: c.code,
                    language: c.language || 'C++',
                    verdict: verdict,
                    status: status,
                    attempts: subData?.total_attempts || 0,
                    updated_at: c.updated_at,
                });
            }
        });

        // 9. Notes & Workspaces
        const userNotes = allUserNotesRes.rows.map((n: any) => ({
            id: n.id,
            contest_id: n.contest_id,
            problem_index: n.problem_index,
            content: n.content,
            updated_at: n.updated_at,
        }));

        const responsePayload = {
            profile,
            metrics,
            sheet_progress: sheetProgressList,
            recent_submissions: recentSubmissions,
            submissions_total: totalSubmissions,
            flagged_problems: flaggedProblems,
            heatmap_data: heatmapData,
            code_catalog: codeCatalog,
            user_notes: userNotes,
            behavioral_analysis: {
                cheating_flags: flaggedProblems.length || profile.cheating_flags || 0,
                risk_score: flaggedProblems.length > 3 ? 'HIGH' : flaggedProblems.length > 0 ? 'MEDIUM' : 'LOW',
            },
        };

        // Cache for 30s
        if (dossierCache.size >= DOSSIER_CACHE_MAX) {
            const now = Date.now();
            for (const [key, entry] of dossierCache) if (entry.expiresAt <= now) dossierCache.delete(key);
            if (dossierCache.size >= DOSSIER_CACHE_MAX) dossierCache.delete(dossierCache.keys().next().value as string);
        }
        dossierCache.set(cacheKey, {
            data: responsePayload,
            expiresAt: Date.now() + 30000,
        });

        return NextResponse.json(responsePayload);
    } catch (error: any) {
        console.error('Mentor Trainee API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
