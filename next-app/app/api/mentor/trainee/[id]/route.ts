import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyMentor } from '@/lib/auth/auth';
import { decrypt, createBlindIndex } from '@/lib/security/encryption';

// High-speed In-Memory Cache (30s TTL per student)
interface CacheEntry {
    data: any;
    expiresAt: number;
}
const CACHE_TTL_MS = 30 * 1000;
const dossierCache = new Map<string, CacheEntry>();

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const mentorUser = await verifyMentor(req);
        if (!mentorUser) {
            return NextResponse.json({ error: 'Unauthorized: Mentor access required' }, { status: 403 });
        }

        const { id: paramId } = await params;
        if (!paramId) {
            return NextResponse.json({ error: 'Missing student identifier' }, { status: 400 });
        }

        const url = new URL(req.url);
        const subOffset = parseInt(url.searchParams.get('sub_offset') || '0', 10);
        const subLimit = parseInt(url.searchParams.get('sub_limit') || '300', 10);

        const cacheKey = `dossier:${paramId.toLowerCase().trim()}:${subOffset}:${subLimit}`;
        const cached = dossierCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json(cached.data, {
                headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=30' }
            });
        }

        // 1. Locate User by User ID or Student ID or CF Handle or Blind Index
        let userRow: any = null;
        let appRow: any = null;

        if (/^\d+$/.test(paramId)) {
            const byUserId = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [paramId]);
            if (byUserId.rows.length > 0) {
                userRow = byUserId.rows[0];
            } else {
                const byAppStudentId = await query('SELECT * FROM applications WHERE student_id = $1 LIMIT 1', [paramId]);
                if (byAppStudentId.rows.length > 0) {
                    appRow = byAppStudentId.rows[0];
                    const uRes = await query('SELECT * FROM users WHERE application_id = $1 LIMIT 1', [appRow.id]);
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
                const uRes = await query('SELECT * FROM users WHERE application_id = $1 LIMIT 1', [appRow.id]);
                if (uRes.rows.length > 0) userRow = uRes.rows[0];
            }
        }

        if (!userRow && !appRow) {
            const appCheck = await query('SELECT id, student_id, name, email, faculty, student_level, telephone, telegram_username, has_laptop, codeforces_profile, leetcode_profile, season_year, submitted_at FROM applications ORDER BY id DESC LIMIT 500');
            for (const a of appCheck.rows) {
                const decSid = decrypt(a.student_id);
                if (decSid === paramId) {
                    appRow = a;
                    const uRes = await query('SELECT * FROM users WHERE application_id = $1 LIMIT 1', [a.id]);
                    if (uRes.rows.length > 0) userRow = uRes.rows[0];
                    break;
                }
            }
        }

        if (!userRow && !appRow) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const userId = userRow?.id;
        const applicationId = userRow?.application_id || appRow?.id;

        if (!appRow && applicationId) {
            const appRes = await query('SELECT * FROM applications WHERE id = $1 LIMIT 1', [applicationId]);
            if (appRes.rows.length > 0) appRow = appRes.rows[0];
        }

        // 2. Profile Details
        const profile = {
            id: userId,
            application_id: applicationId,
            name: decrypt(appRow?.name) || userRow?.codeforces_handle || `Student #${userId}`,
            student_id: decrypt(appRow?.student_id) || appRow?.student_id || `STU-${userId}`,
            email: decrypt(appRow?.email) || decrypt(userRow?.email) || userRow?.email || '',
            phone: decrypt(appRow?.telephone) || '',
            telegram: appRow?.telegram_username || userRow?.telegram_username || '',
            faculty: decrypt(appRow?.faculty) || appRow?.faculty || 'Computing & Informatics',
            academic_level: appRow?.student_level || 'Level 1',
            has_laptop: appRow?.has_laptop ?? true,
            codeforces_handle: userRow?.codeforces_handle || appRow?.codeforces_profile || '',
            leetcode_profile: appRow?.leetcode_profile || '',
            profile_picture: null,
            created_at: userRow?.created_at || appRow?.submitted_at,
            last_login_at: userRow?.last_login_at || null,
            cheating_flags: userRow?.cheating_flags || 0,
            is_shadow_banned: userRow?.is_shadow_banned || false,
            season_year: appRow?.season_year || 2026,
            cohort_group: 'Group A',
        };

        // 3. Parallel Fetching
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
            sumTimeRes
        ] = await Promise.all([
            query('SELECT * FROM user_solve_stats WHERE user_id = $1 LIMIT 1', [userId]),
            query('SELECT * FROM user_streaks WHERE user_id = $1 LIMIT 1', [userId]),
            query('SELECT * FROM recap_2025 WHERE student_id = $1 OR username = $2 LIMIT 1', [profile.student_id, profile.codeforces_handle]),
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
                    cl.name as level_name
                FROM curriculum_sheets cs
                LEFT JOIN curriculum_levels cl ON cs.level_id = cl.id
                ORDER BY cs.level_id ASC, cs.sheet_number ASC, cs.id ASC
            `),
            query(`
                SELECT id, sheet_id, problem_number, problem_letter, title, contest_id, rating
                FROM curriculum_problems
                ORDER BY sheet_id ASC, problem_number ASC, problem_letter ASC
            `),
            query('SELECT sheet_id, problem_id, status FROM user_progress WHERE user_id = $1', [userId]),
            query(`
                SELECT solve_date, solve_count 
                FROM daily_solves 
                WHERE user_id = $1 AND solve_date >= CURRENT_DATE - INTERVAL '365 days'
                ORDER BY solve_date ASC
            `, [userId]),
            query(`
                SELECT 
                    id, contest_id, problem_index, sheet_id, verdict, 
                    language, time_ms, memory_kb, attempt_number, 
                    submitted_at, time_to_solve_seconds, paste_events, 
                    tab_switches, cf_submission_id, source_code
                FROM submissions 
                WHERE user_id = $1 
                ORDER BY submitted_at DESC 
                LIMIT $2 OFFSET $3
            `, [userId, subLimit, subOffset]),
            query('SELECT COUNT(*) as total FROM submissions WHERE user_id = $1', [userId]),
            query(`
                SELECT contest_id, problem_id, code, language, updated_at 
                FROM user_code 
                WHERE user_id = $1 
                ORDER BY updated_at DESC 
                LIMIT 150
            `, [userId]),
            query(`
                SELECT id, contest_id, problem_index, content, updated_at 
                FROM user_notes 
                WHERE user_id = $1 
                ORDER BY updated_at DESC 
                LIMIT 100
            `, [userId]),
            query('SELECT * FROM user_custom_tests WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 10', [userId]),
            query('SELECT SUM(time_to_solve_seconds) as total_sec FROM submissions WHERE user_id = $1', [userId])
        ]);

        const distinctSolved = parseInt(statsRes.rows[0]?.distinct_solved || '0', 10);
        const totalSubmissions = parseInt(subsCountRes.rows[0]?.total || statsRes.rows[0]?.total_submissions || '0', 10);
        const currentStreak = parseInt(streakRes.rows[0]?.current_streak || '0', 10);
        const maxStreak = parseInt(streakRes.rows[0]?.max_streak || '0', 10);
        const lastSolveAt = statsRes.rows[0]?.last_solve_at || streakRes.rows[0]?.last_solve_date;
        const totalProblems = parseInt(totalProblemsRes.rows[0]?.count || '150', 10);

        // Build Sheet and Contest Lookup Maps for Human Labels: "Lv 1 • Sheet B (Loops)"
        const contestToSheetMap = new Map<string, { level: string, sheet_letter: string, sheet_name: string, sheet_id: string }>();
        const sheetIdToSheetMap = new Map<string, { level: string, sheet_letter: string, sheet_name: string, sheet_id: string }>();

        sheetsRes.rows.forEach(s => {
            const info = {
                level: `Lv ${s.level_id || 1}`,
                sheet_letter: s.sheet_letter || `Sheet ${s.sheet_number}`,
                sheet_name: s.name || '',
                sheet_id: String(s.id),
            };
            sheetIdToSheetMap.set(String(s.id), info);
            if (s.contest_id) contestToSheetMap.set(String(s.contest_id), info);
        });

        // Build precise problem solved/attempted Sets
        const solvedSet = new Set<string>();
        const attemptedSet = new Set<string>();

        userProgressRes.rows.forEach((p) => {
            const sheetIdStr = String(p.sheet_id);
            const raw = String(p.problem_id).trim();

            if (p.status === 'SOLVED') {
                solvedSet.add(`${sheetIdStr}_${raw}`);
                if (raw.includes(':')) {
                    const [cid, letter] = raw.split(':');
                    solvedSet.add(`${sheetIdStr}_${letter.toUpperCase()}`);
                    solvedSet.add(`cid_${cid}_${letter.toUpperCase()}`);
                } else if (/^[A-Za-z]+$/.test(raw)) {
                    solvedSet.add(`${sheetIdStr}_${raw.toUpperCase()}`);
                }
            } else if (p.status === 'ATTEMPTED') {
                attemptedSet.add(`${sheetIdStr}_${raw}`);
                if (raw.includes(':')) {
                    const [cid, letter] = raw.split(':');
                    attemptedSet.add(`${sheetIdStr}_${letter.toUpperCase()}`);
                    attemptedSet.add(`cid_${cid}_${letter.toUpperCase()}`);
                } else if (/^[A-Za-z]+$/.test(raw)) {
                    attemptedSet.add(`${sheetIdStr}_${raw.toUpperCase()}`);
                }
            }
        });

        // Group curriculum problems strictly by sheet_id
        const problemsBySheetId = new Map<string, any[]>();
        const problemTitleMap = new Map<string, string>();

        allCurriculumProblemsRes.rows.forEach((prob) => {
            const sheetIdStr = String(prob.sheet_id);
            if (!problemsBySheetId.has(sheetIdStr)) problemsBySheetId.set(sheetIdStr, []);

            const letter = (prob.problem_letter || '').toUpperCase().trim();
            if (prob.contest_id && letter) {
                problemTitleMap.set(`${prob.contest_id}_${letter}`, prob.title);
            }

            let status: 'SOLVED' | 'ATTEMPTED' | 'NOT_STARTED' = 'NOT_STARTED';

            if (
                solvedSet.has(`${sheetIdStr}_${letter}`) ||
                solvedSet.has(`cid_${prob.contest_id}_${letter}`) ||
                solvedSet.has(`${sheetIdStr}_${prob.id}`)
            ) {
                status = 'SOLVED';
            } else if (
                attemptedSet.has(`${sheetIdStr}_${letter}`) ||
                attemptedSet.has(`cid_${prob.contest_id}_${letter}`) ||
                attemptedSet.has(`${sheetIdStr}_${prob.id}`)
            ) {
                status = 'ATTEMPTED';
            }

            problemsBySheetId.get(sheetIdStr)!.push({
                id: prob.id,
                problem_number: prob.problem_number,
                problem_letter: prob.problem_letter,
                title: prob.title,
                contest_id: prob.contest_id,
                rating: prob.rating,
                status: status,
            });
        });

        let totalAttempted = 0;
        const sheetProgressList = sheetsRes.rows.map((s) => {
            const sheetIdStr = String(s.id);
            const sheetProblems = problemsBySheetId.get(sheetIdStr) || [];
            
            const solvedCount = sheetProblems.filter(pr => pr.status === 'SOLVED').length;
            const attemptedCount = sheetProblems.filter(pr => pr.status === 'ATTEMPTED').length;
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
                level_name: s.level_name || 'Level 1',
                contest_id: s.contest_id,
                total_problems: sheetTotal,
                solved: solvedCount,
                attempted: attemptedCount,
                not_started: notStarted,
                progress_percentage: pct,
                problems: sheetProblems,
            };
        });

        const notStartedTotal = Math.max(0, totalProblems - (distinctSolved + totalAttempted));

        // Time spent
        const timeFromRecap = recapRes.rows[0]?.time_spent_minutes;
        let totalMinutes = timeFromRecap ? parseInt(timeFromRecap, 10) : 0;
        if (!totalMinutes) {
            const totalSec = parseInt(sumTimeRes.rows[0]?.total_sec || '0', 10);
            totalMinutes = Math.round(totalSec / 60) || Math.round(distinctSolved * 18);
        }
        const hoursSpent = Math.floor(totalMinutes / 60);
        const minsSpent = totalMinutes % 60;
        const timeSpentStr = `${hoursSpent}h ${minsSpent}m`;

        // Heatmap Data
        const heatmapData = heatmapRes.rows.map((r) => ({
            date: r.solve_date instanceof Date ? r.solve_date.toISOString().slice(0, 10) : String(r.solve_date),
            count: parseInt(r.solve_count, 10) || 0,
        }));

        // Recent Submissions with Human Curriculum Labels
        const recentSubmissions = subsRes.rows.map((s) => {
            const sheetInfo = (s.sheet_id && sheetIdToSheetMap.get(String(s.sheet_id))) || 
                              (s.contest_id && contestToSheetMap.get(String(s.contest_id))) || null;
            
            const pLetter = (s.problem_index || '').toUpperCase();
            const pTitle = problemTitleMap.get(`${s.contest_id}_${pLetter}`) || '';

            const label = sheetInfo 
                ? `${sheetInfo.level} / Sheet ${sheetInfo.sheet_letter} / ${pLetter}`
                : `${s.contest_id} ${pLetter}`;

            return {
                id: s.id,
                problem: label,
                problem_title: pTitle,
                contest_id: s.contest_id,
                problem_index: s.problem_index,
                sheet_id: s.sheet_id,
                sheet_info: sheetInfo,
                verdict: s.verdict || 'Accepted',
                language: s.language || 'C++',
                time_ms: s.time_ms ?? null,
                memory_kb: s.memory_kb ?? null,
                attempts: s.attempt_number || 1,
                submitted_at: s.submitted_at,
                time_to_solve_seconds: s.time_to_solve_seconds || 0,
                paste_events: s.paste_events || 0,
                tab_switches: s.tab_switches || 0,
                cf_submission_id: s.cf_submission_id,
                source_code: s.source_code || '',
            };
        });

        // Build Code Catalog with Human Labels: "Lv 1 / Sheet B / Problem V"
        const codeEntriesMap = new Map<string, any>();

        allUserCodesRes.rows.forEach((uc) => {
            const key = `${uc.contest_id || ''}-${uc.problem_id || ''}`.trim();
            if (key) {
                const sheetInfo = contestToSheetMap.get(String(uc.contest_id)) || null;
                const pLetter = (uc.problem_id || '').toUpperCase();
                const pTitle = problemTitleMap.get(`${uc.contest_id}_${pLetter}`) || '';

                const label = sheetInfo 
                    ? `${sheetInfo.level} / Sheet ${sheetInfo.sheet_letter} / ${pLetter}`
                    : `${uc.contest_id} ${pLetter}`;

                codeEntriesMap.set(key, {
                    key,
                    display_label: label,
                    sheet_name: sheetInfo ? sheetInfo.sheet_name : '',
                    problem_title: pTitle,
                    contest_id: uc.contest_id,
                    problem_id: uc.problem_id,
                    code: uc.code,
                    language: uc.language,
                    updated_at: uc.updated_at,
                });
            }
        });

        recentSubmissions.forEach((sub) => {
            const key = `${sub.contest_id || ''}-${sub.problem_index || ''}`.trim();
            if (key) {
                const sheetInfo = sub.sheet_info || contestToSheetMap.get(String(sub.contest_id)) || null;
                const pLetter = (sub.problem_index || '').toUpperCase();
                const pTitle = sub.problem_title || problemTitleMap.get(`${sub.contest_id}_${pLetter}`) || '';

                const label = sheetInfo 
                    ? `${sheetInfo.level} / Sheet ${sheetInfo.sheet_letter} / ${pLetter}`
                    : `${sub.contest_id} ${pLetter}`;

                if (!codeEntriesMap.has(key)) {
                    codeEntriesMap.set(key, {
                        key,
                        display_label: label,
                        sheet_name: sheetInfo ? sheetInfo.sheet_name : '',
                        problem_title: pTitle,
                        contest_id: sub.contest_id,
                        problem_id: sub.problem_index,
                        code: sub.source_code,
                        language: sub.language,
                        updated_at: sub.submitted_at,
                    });
                } else if (!codeEntriesMap.get(key)!.code && sub.source_code) {
                    codeEntriesMap.get(key)!.code = sub.source_code;
                }
            }
        });

        const codeCatalog = Array.from(codeEntriesMap.values());

        const responsePayload = {
            success: true,
            profile,
            metrics: {
                problems_solved: distinctSolved,
                solved_percentage: Math.min(100, Math.round((distinctSolved / (totalProblems || 1)) * 100)),
                attempted: totalAttempted,
                attempted_percentage: Math.min(100, Math.round((totalAttempted / (totalProblems || 1)) * 100)),
                not_started: notStartedTotal,
                not_started_percentage: Math.min(100, Math.round((notStartedTotal / (totalProblems || 1)) * 100)),
                current_streak: currentStreak,
                max_streak: maxStreak,
                total_submissions: totalSubmissions,
                submissions_last_7_days: recentSubmissions.filter(s => {
                    const diff = Date.now() - new Date(s.submitted_at).getTime();
                    return diff <= 7 * 24 * 60 * 60 * 1000;
                }).length,
                time_spent_str: timeSpentStr,
                time_spent_minutes: totalMinutes,
                last_solve_at: lastSolveAt,
            },
            sheet_progress: sheetProgressList,
            heatmap_data: heatmapData,
            recent_submissions: recentSubmissions,
            submissions_total: totalSubmissions,
            code_catalog: codeCatalog,
            user_notes: allUserNotesRes.rows.map(n => ({
                id: n.id,
                contest_id: n.contest_id,
                problem_index: n.problem_index,
                content: n.content,
                updated_at: n.updated_at,
            })),
            custom_tests: customTestsRes.rows,
            flagged_problems: [],
            behavioral_analysis: {
                cheating_flags: profile.cheating_flags,
                is_shadow_banned: profile.is_shadow_banned,
                total_flagged_count: profile.cheating_flags,
            }
        };

        dossierCache.set(cacheKey, {
            data: responsePayload,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        if (dossierCache.size > 100) {
            const oldestKey = dossierCache.keys().next().value;
            if (oldestKey) dossierCache.delete(oldestKey);
        }

        return NextResponse.json(responsePayload, {
            headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=30' }
        });

    } catch (error: unknown) {
        console.error('[Mentor API] Error fetching trainee dossier:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
