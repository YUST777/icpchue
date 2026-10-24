import { query } from '@/lib/db/db';
import { createBlindIndex, decrypt } from '@/lib/security/encryption';
import { getCachedData } from '@/lib/cache/cache';

export interface PublicSheetProblem {
    letter: string;
    title: string;
    url: string | null;
}

export interface PublicSheet {
    id: string;
    letter: string;
    name: string;
    levelNumber: number;
    levelName: string;
    solved: number;
    total: number;
    problems: PublicSheetProblem[];
}

export interface PublicAchievement {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'legendary';
    earnedAt: string;
}

export interface PublicProfile {
    studentId: string;
    name: string;
    role: string;
    faculty: string | null;
    studentLevel: string | null;
    joinedAt: string | null;
    picture: string | null;
    codeforces: { handle: string; rating?: number; maxRating?: number; rank?: string } | null;
    leetcode: string | null;
    stats: { solved: number; sheetsStarted: number; sheetsDone: number; currentStreak: number; maxStreak: number; activeDays: number };
    sheets: PublicSheet[];
    achievements: PublicAchievement[];
}

export type PublicProfileResult =
    | { status: 'ok'; profile: PublicProfile }
    | { status: 'private' }
    | { status: 'not_found' };

const ACHIEVEMENT_INFO: Record<string, Pick<PublicAchievement, 'name' | 'description' | 'rarity'>> = {
    welcome: { name: 'Welcome', description: 'Joined ICPC HUE', rarity: 'common' },
    approval: { name: 'Approved', description: 'Completed the approval camp', rarity: 'rare' },
    'sheet-1': { name: 'Sheet 1 Complete', description: 'Solved every problem in Sheet 1', rarity: 'rare' },
    '500pts': { name: '500 Points', description: 'Reached 500 points', rarity: 'rare' },
    instructor: { name: 'Instructor', description: 'Teaches at ICPC HUE', rarity: 'legendary' },
    'rank1-march-2026': { name: 'Rank 1 · March 2026', description: 'Top of the leaderboard in March 2026', rarity: 'legendary' },
};

const RARITY_ORDER = { legendary: 3, rare: 2, common: 1 } as const;

/**
 * Everything the public profile page, its API and its share image show.
 * Profiles flagged for cheating keep their identity but never list solved work.
 */
export async function getPublicProfile(studentId: string): Promise<PublicProfileResult> {
    if (!/^\d{7,10}$/.test(studentId)) return { status: 'not_found' };

    return getCachedData(`public-profile:v2:${studentId}`, 60, async (): Promise<PublicProfileResult> => {
        // Some older accounts store the address unencrypted and their blind
        // index was built before the current salt, so match either way.
        const email = `${studentId}@horus.edu.eg`;
        const userResult = await query(
            `SELECT id, role, profile_visibility, show_public_profile, created_at, application_id,
                    profile_picture, codeforces_data, codeforces_handle, is_shadow_banned, cheating_flags
             FROM users WHERE email_blind_index = $1 OR lower(email) = $2
             ORDER BY (email_blind_index = $1) DESC NULLS LAST
             LIMIT 1`,
            [createBlindIndex(email), email]
        );
        if (userResult.rows.length === 0) return { status: 'not_found' };

        const user = userResult.rows[0];
        if (user.profile_visibility === 'private' || user.show_public_profile === false) return { status: 'private' };

        const appResult = await query(
            'SELECT name, faculty, student_level, leetcode_profile FROM applications WHERE id = $1',
            [user.application_id]
        );
        const application = appResult.rows[0] || {};
        const hideWork = user.is_shadow_banned === true || Number(user.cheating_flags) > 0;

        const [progressResult, streakResult, activeDaysResult, achievementResult] = await Promise.all([
            hideWork ? Promise.resolve({ rows: [] }) : query(
                `SELECT s.id AS sheet_id, s.sheet_letter, s.name AS sheet_name, s.total_problems,
                        l.level_number, l.name AS level_name,
                        p.problem_letter, p.title, p.codeforces_url
                 FROM (SELECT DISTINCT sheet_id, problem_id FROM user_progress
                        WHERE user_id = $1 AND status = 'SOLVED') up
                 JOIN curriculum_sheets s ON s.id::text = up.sheet_id
                 JOIN curriculum_levels l ON l.id = s.level_id
                 JOIN curriculum_problems p ON p.sheet_id = s.id
                      AND p.contest_id || ':' || p.problem_letter = up.problem_id
                 ORDER BY l.level_number, s.sheet_letter, p.problem_letter`,
                [user.id]
            ),
            hideWork ? Promise.resolve({ rows: [] }) : query(
                'SELECT COALESCE(MAX(current_streak), 0) AS current_streak, COALESCE(MAX(max_streak), 0) AS max_streak FROM user_streaks WHERE user_id = $1',
                [user.id]
            ),
            hideWork ? Promise.resolve({ rows: [] }) : query(
                'SELECT COUNT(DISTINCT solve_date) AS days FROM daily_solves WHERE user_id = $1',
                [user.id]
            ),
            query('SELECT achievement_id, earned_at FROM user_achievements WHERE user_id = $1', [user.id]),
        ]);

        const sheetMap = new Map<string, PublicSheet>();
        for (const row of progressResult.rows) {
            let sheet = sheetMap.get(row.sheet_id);
            if (!sheet) {
                sheet = {
                    id: String(row.sheet_id),
                    letter: row.sheet_letter,
                    name: row.sheet_name,
                    levelNumber: Number(row.level_number),
                    levelName: row.level_name,
                    solved: 0,
                    total: Number(row.total_problems),
                    problems: [],
                };
                sheetMap.set(row.sheet_id, sheet);
            }
            sheet.solved += 1;
            sheet.problems.push({ letter: row.problem_letter, title: row.title, url: row.codeforces_url || null });
        }
        const sheets = [...sheetMap.values()];

        const cf = user.codeforces_data as { handle?: string; rating?: number; maxRating?: number; rank?: string } | null;
        const cfHandle: string | null = user.codeforces_handle || cf?.handle || null;

        const achievements: PublicAchievement[] = (achievementResult.rows as { achievement_id: string; earned_at: string }[])
            .filter(r => ACHIEVEMENT_INFO[r.achievement_id])
            .map(r => ({ id: r.achievement_id, ...ACHIEVEMENT_INFO[r.achievement_id], earnedAt: new Date(r.earned_at).toISOString() }))
            .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]);

        let name = '';
        try { name = decrypt(application.name) || ''; } catch { name = ''; }
        let leetcode: string | null = null;
        try { leetcode = decrypt(application.leetcode_profile) || null; } catch { leetcode = null; }

        return {
            status: 'ok',
            profile: {
                studentId,
                name,
                role: user.role,
                faculty: application.faculty || null,
                studentLevel: application.student_level || null,
                joinedAt: user.created_at ? new Date(user.created_at).toISOString() : null,
                picture: user.profile_picture || null,
                codeforces: cfHandle ? { handle: cfHandle, rating: cf?.rating, maxRating: cf?.maxRating, rank: cf?.rank } : null,
                leetcode,
                stats: {
                    solved: sheets.reduce((n, s) => n + s.solved, 0),
                    sheetsStarted: sheets.length,
                    sheetsDone: sheets.filter(s => s.total > 0 && s.solved >= s.total).length,
                    currentStreak: Number(streakResult.rows[0]?.current_streak || 0),
                    maxStreak: Number(streakResult.rows[0]?.max_streak || 0),
                    activeDays: Number(activeDaysResult.rows[0]?.days || 0),
                },
                sheets,
                achievements,
            },
        };
    });
}
