import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyMentor } from '@/lib/auth/auth';
import { decrypt, createBlindIndex } from '@/lib/security/encryption';

// High-speed In-Memory Cache (30s TTL)
interface CacheEntry {
    data: any;
    expiresAt: number;
}
const CACHE_TTL_MS = 30 * 1000;
let traineesCache: CacheEntry | null = null;
let curriculumTotal = 0;

function normalizeSearchText(text: string): string {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove Arabic tashkeel and tatweel
        .replace(/[أإآ]/g, 'ا')                       // Normalize Alef variants
        .replace(/ة/g, 'ه')                           // Normalize Teh Marbuta
        .replace(/ى/g, 'ي')                           // Normalize Alef Maksura
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

export async function GET(req: NextRequest) {
    try {
        const mentorUser = await verifyMentor(req);
        if (!mentorUser) {
            return NextResponse.json({ error: 'Unauthorized: Mentor access required' }, { status: 403 });
        }

        const url = new URL(req.url);
        const search = (url.searchParams.get('search') || '').trim();
        const level = (url.searchParams.get('level') || 'all').trim();
        const statusFilter = (url.searchParams.get('status') || 'all').trim(); // all | active | stuck | flagged | banned | inactive
        const timeRange = (url.searchParams.get('timeRange') || 'all').trim(); // all | 24h | 3d | 7d | 30d | inactive_7d | inactive_14d | inactive_30d
        const sortBy = (url.searchParams.get('sortBy') || 'solves_desc').trim();
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25));

        // 1. Fetch from Cache if fresh
        let allTrainees: any[] = [];
        if (traineesCache && traineesCache.expiresAt > Date.now()) {
            allTrainees = traineesCache.data;
        } else {
            // Fast Single-Query with CTEs
            const result = await query(`
                WITH user_solve_counts AS (
                    SELECT 
                        user_id, 
                        COUNT(DISTINCT problem_id) FILTER (WHERE status = 'SOLVED') as total_solved,
                        COUNT(DISTINCT problem_id) FILTER (WHERE status = 'ATTEMPTED') as total_attempted
                    FROM user_progress 
                    WHERE status IN ('SOLVED', 'ATTEMPTED')
                    GROUP BY user_id
                ),
                latest_submissions AS (
                    SELECT 
                        user_id, 
                        MAX(submitted_at) as last_submission_at,
                        COUNT(*) as total_submissions
                    FROM submissions
                    GROUP BY user_id
                )
                SELECT 
                    u.id as user_id,
                    u.email_blind_index as user_email_bi,
                    u.codeforces_handle,
                    u.telegram_username,
                    u.cheating_flags,
                    u.is_shadow_banned,
                    u.created_at as user_created_at,
                    u.last_login_at,
                    a.id as application_id,
                    a.application_type,
                    a.student_id,
                    a.name as encrypted_name,
                    a.email_blind_index as app_email_bi,
                    a.faculty as encrypted_faculty,
                    a.student_level,
                    a.telephone as encrypted_phone,
                    a.telegram_username as app_telegram,
                    a.codeforces_profile,
                    a.has_laptop,
                    a.season_year,
                    a.submitted_at,
                    COALESCE(usc.total_solved, 0) as total_solved,
                    COALESCE(usc.total_attempted, 0) as total_attempted,
                    COALESCE(ls.total_submissions, 0) as total_submissions,
                    ls.last_submission_at,
                    COALESCE(us.current_streak, 0) as current_streak,
                    COALESCE(us.max_streak, 0) as max_streak,
                    us.last_solve_date
                FROM users u
                -- Exactly one application per user: the linked one, otherwise the
                -- newest application with the same email. The old OR-join
                -- duplicated returning students (e.g. 2026 + Level 0 2027).
                LEFT JOIN LATERAL (
                    SELECT ap.*
                      FROM applications ap
                     WHERE ap.id = u.application_id
                        OR (u.application_id IS NULL AND u.email_blind_index IS NOT NULL AND ap.email_blind_index = u.email_blind_index)
                     ORDER BY (ap.id = u.application_id) DESC, ap.id DESC
                     LIMIT 1
                ) a ON true
                LEFT JOIN user_solve_counts usc ON u.id = usc.user_id
                LEFT JOIN latest_submissions ls ON u.id = ls.user_id
                LEFT JOIN user_streaks us ON u.id = us.user_id
                WHERE u.role NOT IN ('mentor', 'instructor', 'owner') OR u.role IS NULL
                ORDER BY u.id DESC
            `);
            const curriculumCount = await query('SELECT COUNT(*)::int AS c FROM curriculum_problems');
            const totalCurriculumProblems = Number(curriculumCount.rows[0]?.c) || 0;
            const now = Date.now();

            allTrainees = result.rows.map((row) => {
                const decryptedName = decrypt(row.encrypted_name) || row.codeforces_handle || `Student #${row.user_id || row.application_id}`;
                // student_id and faculty are stored as plaintext; only email,
                // phone and national ID are encrypted.
                const studentId = row.student_id || `STU-${row.user_id || row.application_id}`;
                const trainingLevel = (String(row.application_type || '').match(/^level(\d)_training_/) || [])[1] ?? null;

                // Most recent of submission, login and solve (not the first non-null).
                const activityMs = [row.last_submission_at, row.last_login_at, row.last_solve_date]
                    .map((d) => (d ? new Date(d).getTime() : 0))
                    .filter((t) => Number.isFinite(t) && t > 0);
                const validLastActiveMs = activityMs.length ? Math.max(...activityMs) : 0;
                const lastActiveDate = validLastActiveMs ? new Date(validLastActiveMs).toISOString() : null;
                const hoursSinceActive = validLastActiveMs ? (now - validLastActiveMs) / (1000 * 60 * 60) : Infinity;
                const daysSinceActive = validLastActiveMs ? Math.floor(hoursSinceActive / 24) : 999;
                
                const totalSolved = parseInt(row.total_solved, 10) || 0;
                const totalAttempted = parseInt(row.total_attempted, 10) || 0;
                // Several problems tried but not solved, with few solves overall.
                const isStuck = totalAttempted >= 3 && totalSolved < 5;
                const isInactive = daysSinceActive > 7;
                const flagsCount = parseInt(row.cheating_flags, 10) || 0;
                const isBanned = Boolean(row.is_shadow_banned);

                return {
                    id: row.user_id || row.application_id,
                    user_id: row.user_id,
                    application_id: row.application_id,
                    name: decryptedName,
                    student_id: studentId,
                    // Exact-email search goes through the blind index. Decrypting
                    // every email here cost ~60ms each (cryptr's PBKDF2), ~25s per
                    // rebuild, and the directory never shows emails anyway.
                    email_bis: [row.app_email_bi, row.user_email_bi].filter(Boolean),
                    faculty: row.encrypted_faculty || '',
                    telegram: row.telegram_username || row.app_telegram || '',
                    codeforces_handle: row.codeforces_handle || '',
                    academic_level: row.student_level || '',
                    training_level: trainingLevel,
                    has_laptop: row.has_laptop ?? null,
                    total_solved: totalSolved,
                    total_attempted: totalAttempted,
                    total_submissions: parseInt(row.total_submissions, 10) || 0,
                    progress_percentage: totalCurriculumProblems ? Math.min(100, Math.round((totalSolved / totalCurriculumProblems) * 100)) : 0,
                    current_streak: parseInt(row.current_streak, 10) || 0,
                    max_streak: parseInt(row.max_streak, 10) || 0,
                    last_active_at: lastActiveDate,
                    days_since_active: daysSinceActive,
                    hours_since_active: hoursSinceActive,
                    flags_count: flagsCount,
                    is_shadow_banned: isBanned,
                    is_stuck: isStuck,
                    is_inactive: isInactive,
                    status_badge: isBanned ? 'BANNED' : (flagsCount > 0 ? 'FLAGGED' : (isStuck ? 'STUCK' : (isInactive ? 'INACTIVE' : 'ACTIVE'))),
                };
            });

            curriculumTotal = totalCurriculumProblems;
            traineesCache = {
                data: allTrainees,
                expiresAt: Date.now() + CACHE_TTL_MS,
            };
        }

        // 2. Client-side Search, Level Filter, Status Filter with Arabic Normalization
        let filtered = allTrainees;

        if (search) {
            const normSearch = normalizeSearchText(search);
            const searchBlindIndex = createBlindIndex(search);

            filtered = filtered.filter((t) => {
                const normName = normalizeSearchText(t.name);
                const normSid = normalizeSearchText(t.student_id);
                const normHandle = normalizeSearchText(t.codeforces_handle);

                const matchText = normName.includes(normSearch) ||
                                  normSid.includes(normSearch) ||
                                  normHandle.includes(normSearch);

                return matchText || Boolean(searchBlindIndex && t.email_bis.includes(searchBlindIndex));
            });
        }

        if (level && level !== 'all') {
            // "Level 0".."Level 3" = training level; exact match only (no
            // substring matches like "Level 1" vs "Level 10").
            const wanted = (level.match(/(\d+)/) || [])[1] ?? null;
            filtered = filtered.filter((t) => {
                const academic = (String(t.academic_level).match(/(\d+)/) || [])[1] ?? null;
                return wanted !== null && (t.training_level === wanted || (t.training_level === null && academic === wanted));
            });
        }

        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter((t) => {
                if (statusFilter === 'active') return !t.is_inactive && !t.is_shadow_banned && t.flags_count === 0;
                if (statusFilter === 'stuck') return t.is_stuck;
                if (statusFilter === 'flagged') return t.flags_count > 0;
                if (statusFilter === 'banned') return t.is_shadow_banned;
                if (statusFilter === 'inactive') return t.is_inactive;
                return true;
            });
        }

        if (timeRange && timeRange !== 'all') {
            filtered = filtered.filter((t) => {
                if (timeRange === '24h' || timeRange === 'today') return t.hours_since_active <= 24;
                if (timeRange === '3d') return t.days_since_active <= 3;
                if (timeRange === '7d' || timeRange === 'week') return t.days_since_active <= 7;
                if (timeRange === '30d' || timeRange === 'month') return t.days_since_active <= 30;
                if (timeRange === 'inactive_7d') return t.days_since_active > 7;
                if (timeRange === 'inactive_14d') return t.days_since_active > 14;
                if (timeRange === 'inactive_30d') return t.days_since_active > 30;
                return true;
            });
        }

        // 3. Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'solves_desc') return b.total_solved - a.total_solved;
            if (sortBy === 'solves_asc') return a.total_solved - b.total_solved;
            if (sortBy === 'streak_desc') return b.current_streak - a.current_streak;
            if (sortBy === 'flags_desc') return b.flags_count - a.flags_count;
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'recent_active') {
                const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
                const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
                return timeB - timeA;
            }
            if (sortBy === 'oldest_active') {
                const timeA = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
                const timeB = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
                return timeA - timeB;
            }
            return b.total_solved - a.total_solved;
        });

        // 4. Pagination
        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / limit) || 1;
        const offset = (page - 1) * limit;
        const paginated = filtered.slice(offset, offset + limit);

        // 5. Aggregate Summary Counts
        const summary = {
            total_trainees: allTrainees.length,
            // Same rule as the "active" filter so the card matches the list.
            active_trainees: allTrainees.filter(t => !t.is_inactive && !t.is_shadow_banned && t.flags_count === 0).length,
            stuck_trainees: allTrainees.filter(t => t.is_stuck).length,
            flagged_trainees: allTrainees.filter(t => t.flags_count > 0 || t.is_shadow_banned).length,
            inactive_trainees: allTrainees.filter(t => t.is_inactive).length,
            level_distribution: Object.fromEntries(['0', '1', '2', '3'].map((n) => [
                `level_${n}`,
                allTrainees.filter((t) => t.training_level === n ||
                    (t.training_level === null && (String(t.academic_level).match(/(\d+)/) || [])[1] === n)).length,
            ])),
            total_curriculum_problems: curriculumTotal,
        };

        return NextResponse.json({
            success: true,
            summary,
            pagination: {
                page,
                limit,
                total_items: totalCount,
                total_pages: totalPages,
            },
            // Contact details are not needed on the directory; keep them out of the payload.
            trainees: paginated.map(({ email_bis: _emailBis, ...rest }) => rest),
        }, {
            headers: {
                'Cache-Control': 'private, max-age=30'
            }
        });

    } catch (error: unknown) {
        console.error('[Mentor API] Error fetching trainees directory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
