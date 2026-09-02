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
                        COUNT(DISTINCT problem_id) as total_solved,
                        COUNT(CASE WHEN status = 'ATTEMPTED' THEN 1 END) as total_attempted
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
                    u.email as user_email,
                    u.codeforces_handle,
                    u.telegram_username,
                    u.cheating_flags,
                    u.is_shadow_banned,
                    u.created_at as user_created_at,
                    u.last_login_at,
                    a.id as application_id,
                    a.student_id,
                    a.name as encrypted_name,
                    a.email as encrypted_email,
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
                FROM applications a
                LEFT JOIN users u ON a.id = u.application_id
                LEFT JOIN user_solve_counts usc ON u.id = usc.user_id
                LEFT JOIN latest_submissions ls ON u.id = ls.user_id
                LEFT JOIN user_streaks us ON u.id = us.user_id
                WHERE a.status = 'APPROVED' OR u.id IS NOT NULL
                ORDER BY u.id DESC NULLS LAST
            `);

            const totalCurriculumProblems = 150;
            const now = Date.now();

            allTrainees = result.rows.map((row) => {
                const decryptedName = decrypt(row.encrypted_name) || row.codeforces_handle || `Student #${row.user_id || row.application_id}`;
                const decryptedSid = decrypt(row.student_id) || row.student_id || `STU-${row.user_id || row.application_id}`;
                const decryptedEmail = decrypt(row.encrypted_email) || decrypt(row.user_email) || row.user_email || '';
                const decryptedFaculty = decrypt(row.encrypted_faculty) || 'Computing & Informatics';
                const decryptedPhone = decrypt(row.encrypted_phone) || '';

                const lastActiveDate = row.last_submission_at || row.last_login_at || row.last_solve_date || row.submitted_at;
                const lastActiveMs = lastActiveDate ? new Date(lastActiveDate).getTime() : 0;
                const validLastActiveMs = Number.isFinite(lastActiveMs) && lastActiveMs > 0 ? lastActiveMs : 0;
                const daysSinceActive = validLastActiveMs ? Math.floor((now - validLastActiveMs) / (1000 * 60 * 60 * 24)) : 999;
                
                const totalSolved = parseInt(row.total_solved, 10) || 0;
                const totalAttempted = parseInt(row.total_attempted, 10) || 0;
                const isStuck = totalAttempted > 3 && totalSolved < 5;
                const isInactive = daysSinceActive > 7;
                const flagsCount = parseInt(row.cheating_flags, 10) || 0;
                const isBanned = Boolean(row.is_shadow_banned);

                return {
                    id: row.user_id || row.application_id,
                    user_id: row.user_id,
                    application_id: row.application_id,
                    name: decryptedName,
                    student_id: decryptedSid,
                    email: decryptedEmail,
                    faculty: decryptedFaculty,
                    phone: decryptedPhone,
                    telegram: row.telegram_username || row.app_telegram || '',
                    codeforces_handle: row.codeforces_handle || row.codeforces_profile || '',
                    academic_level: row.student_level || 'Level 1',
                    has_laptop: row.has_laptop ?? true,
                    total_solved: totalSolved,
                    total_attempted: totalAttempted,
                    total_submissions: parseInt(row.total_submissions, 10) || 0,
                    progress_percentage: Math.min(100, Math.round((totalSolved / (totalCurriculumProblems || 1)) * 100)),
                    current_streak: parseInt(row.current_streak, 10) || 0,
                    max_streak: parseInt(row.max_streak, 10) || 0,
                    last_active_at: lastActiveDate,
                    days_since_active: daysSinceActive,
                    flags_count: flagsCount,
                    is_shadow_banned: isBanned,
                    is_stuck: isStuck,
                    is_inactive: isInactive,
                    status_badge: isBanned ? 'BANNED' : (flagsCount > 0 ? 'FLAGGED' : (isStuck ? 'STUCK' : (isInactive ? 'INACTIVE' : 'ACTIVE'))),
                };
            });

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
                const normEmail = normalizeSearchText(t.email);

                const matchText = normName.includes(normSearch) || 
                                  normSid.includes(normSearch) || 
                                  normHandle.includes(normSearch) || 
                                  normEmail.includes(normSearch);

                return matchText || (searchBlindIndex && (t.student_id === search || t.email === search));
            });
        }

        if (level && level !== 'all') {
            const normLevel = normalizeSearchText(level).replace(/\s+/g, '');
            filtered = filtered.filter((t) => {
                const sLvl = normalizeSearchText(t.academic_level).replace(/\s+/g, '');
                return sLvl.includes(normLevel) || sLvl.includes(`l${normLevel}`);
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
                if (timeRange === '24h' || timeRange === 'today') return t.days_since_active <= 1;
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
            active_trainees: allTrainees.filter(t => !t.is_inactive && !t.is_shadow_banned).length,
            stuck_trainees: allTrainees.filter(t => t.is_stuck).length,
            flagged_trainees: allTrainees.filter(t => t.flags_count > 0 || t.is_shadow_banned).length,
            inactive_trainees: allTrainees.filter(t => t.is_inactive).length,
            level_distribution: {
                level_0: allTrainees.filter(t => t.academic_level.includes('0')).length,
                level_1: allTrainees.filter(t => t.academic_level.includes('1')).length,
                level_2: allTrainees.filter(t => t.academic_level.includes('2')).length,
                level_3: allTrainees.filter(t => t.academic_level.includes('3')).length,
            }
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
            trainees: paginated,
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
