import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyMentor } from '@/lib/auth/auth';
import { decrypt } from '@/lib/security/encryption';

// High-speed In-Memory Cache (30s TTL)
interface CacheEntry {
    data: any;
    expiresAt: number;
}
const CACHE_TTL_MS = 30 * 1000;
const traineesCache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest) {
    try {
        const mentorUser = await verifyMentor(req);
        if (!mentorUser) {
            return NextResponse.json({ error: 'Unauthorized: Mentor access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('q')?.toLowerCase().trim() || '';
        const level = searchParams.get('level') || 'all';
        const filter = searchParams.get('filter') || 'all';
        const sortBy = searchParams.get('sort') || 'solved_desc';

        const cacheKey = `${search}:${level}:${filter}:${sortBy}`;
        const cached = traineesCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return NextResponse.json(cached.data, {
                headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=30' }
            });
        }

        // Parallel batch queries
        const [totalProblemsRes, usersRes] = await Promise.all([
            query('SELECT COUNT(*) as count FROM curriculum_problems'),
            query(`
                SELECT 
                    u.id, 
                    u.email, 
                    u.role, 
                    u.codeforces_handle, 
                    u.profile_picture, 
                    u.cheating_flags, 
                    u.is_shadow_banned, 
                    u.last_login_at, 
                    u.created_at,
                    u.application_id,
                    a.name AS student_name,
                    a.student_id,
                    a.faculty,
                    a.student_level,
                    a.telephone,
                    a.telegram_username,
                    a.has_laptop,
                    a.codeforces_profile,
                    a.leetcode_profile,
                    COALESCE(s.distinct_solved, 0) as distinct_solved,
                    COALESCE(s.total_submissions, 0) as total_submissions,
                    COALESCE(s.total_accepted, 0) as total_accepted,
                    s.last_solve_at,
                    COALESCE(st.current_streak, 0) as current_streak,
                    COALESCE(st.max_streak, 0) as max_streak
                FROM users u
                LEFT JOIN applications a ON u.application_id = a.id
                LEFT JOIN user_solve_stats s ON u.id = s.user_id
                LEFT JOIN user_streaks st ON u.id = st.user_id
                WHERE u.role IN ('trainee', 'mentor') OR u.role IS NULL
                ORDER BY s.distinct_solved DESC NULLS LAST, u.id ASC
            `)
        ]);

        const totalCurriculumProblems = parseInt(totalProblemsRes.rows[0]?.count || '150', 10);
        const now = Date.now();

        const trainees = usersRes.rows.map((row) => {
            const decName = decrypt(row.student_name) || row.codeforces_handle || `Trainee #${row.id}`;
            const decStudentId = decrypt(row.student_id) || `STU-${row.id}`;
            const decEmail = decrypt(row.email) || row.email || '';
            const decFaculty = decrypt(row.faculty) || 'Computing & Informatics';
            const decPhone = decrypt(row.telephone) || '';
            const decLevel = row.student_level || 'Level 1';

            const lastLoginMs = row.last_login_at ? new Date(row.last_login_at).getTime() : 0;
            const daysSinceLogin = lastLoginMs ? Math.floor((now - lastLoginMs) / (1000 * 60 * 60 * 24)) : 999;
            const isInactive = daysSinceLogin > 7;
            const isFlagged = (row.cheating_flags && row.cheating_flags > 0) || row.is_shadow_banned === true;
            const solvedCount = parseInt(row.distinct_solved, 10);
            const solvePercentage = Math.min(100, Math.round((solvedCount / (totalCurriculumProblems || 1)) * 100));

            return {
                id: row.id,
                application_id: row.application_id,
                name: decName,
                student_id: decStudentId,
                email: decEmail,
                faculty: decFaculty,
                academic_level: decLevel,
                phone: decPhone,
                telegram: row.telegram_username || '',
                has_laptop: row.has_laptop ?? true,
                codeforces_handle: row.codeforces_handle || row.codeforces_profile || '',
                leetcode_profile: row.leetcode_profile || '',
                role: row.role || 'trainee',
                solved_count: solvedCount,
                solve_percentage: solvePercentage,
                total_submissions: parseInt(row.total_submissions, 10),
                current_streak: parseInt(row.current_streak, 10),
                max_streak: parseInt(row.max_streak, 10),
                cheating_flags: row.cheating_flags || 0,
                is_shadow_banned: row.is_shadow_banned || false,
                last_login_at: row.last_login_at,
                last_solve_at: row.last_solve_at,
                created_at: row.created_at,
                is_inactive: isInactive,
                is_flagged: isFlagged,
            };
        });

        // Search & Filters
        const filtered = trainees.filter((t) => {
            if (search) {
                const matchName = t.name.toLowerCase().includes(search);
                const matchId = t.student_id.toLowerCase().includes(search);
                const matchHandle = t.codeforces_handle.toLowerCase().includes(search);
                const matchEmail = t.email.toLowerCase().includes(search);
                if (!matchName && !matchId && !matchHandle && !matchEmail) return false;
            }

            if (level !== 'all') {
                const normalizedLevel = level.toLowerCase();
                const studentLvl = t.academic_level.toLowerCase();
                if (!studentLvl.includes(normalizedLevel) && !studentLvl.includes(`l${normalizedLevel}`)) {
                    return false;
                }
            }

            if (filter === 'flagged') return t.is_flagged;
            if (filter === 'inactive') return t.is_inactive;
            if (filter === 'active') return !t.is_inactive;

            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'solved_desc') return b.solved_count - a.solved_count;
            if (sortBy === 'activity_desc') {
                const timeA = a.last_solve_at ? new Date(a.last_solve_at).getTime() : 0;
                const timeB = b.last_solve_at ? new Date(b.last_solve_at).getTime() : 0;
                return timeB - timeA;
            }
            if (sortBy === 'streak_desc') return b.current_streak - a.current_streak;
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            return 0;
        });

        const summary = {
            total_trainees: trainees.length,
            active_count: trainees.filter(t => !t.is_inactive).length,
            inactive_count: trainees.filter(t => t.is_inactive).length,
            flagged_count: trainees.filter(t => t.is_flagged).length,
            total_curriculum_problems: totalCurriculumProblems,
        };

        const responsePayload = {
            success: true,
            summary,
            trainees: filtered,
        };

        // Cache response
        traineesCache.set(cacheKey, {
            data: responsePayload,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        // Limit cache size to 50 entries
        if (traineesCache.size > 50) {
            const oldestKey = traineesCache.keys().next().value;
            if (oldestKey) traineesCache.delete(oldestKey);
        }

        return NextResponse.json(responsePayload, {
            headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=30' }
        });

    } catch (error: unknown) {
        console.error('[Mentor API] Error fetching trainees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
