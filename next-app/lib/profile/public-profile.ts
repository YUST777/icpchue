import { query } from '@/lib/db/db';
import { createBlindIndex, decrypt } from '@/lib/security/encryption';
import { getCachedData } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';
import { formatDisplayName } from '@/lib/names';
import { ACHIEVEMENT_META } from '@/lib/achievements/catalog';
import { cleanSocials, toHandle, type SocialLinks } from './socials';

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
    socials: SocialLinks;
    stats: { solved: number; sheetsStarted: number; sheetsDone: number; currentStreak: number; maxStreak: number; activeDays: number };
    sheets: PublicSheet[];
    achievements: PublicAchievement[];
}

export type PublicProfileResult =
    | { status: 'ok'; profile: PublicProfile }
    | { status: 'private' }
    | { status: 'not_found' };

const ACHIEVEMENT_INFO: Record<string, Pick<PublicAchievement, 'name' | 'description' | 'rarity'>> = Object.fromEntries(
    Object.entries(ACHIEVEMENT_META).map(([id, m]) => [id, { name: m.name, description: m.desc, rarity: m.tier }])
);

const RARITY_ORDER = { legendary: 3, rare: 2, common: 1 } as const;

/**
 * Everything the public profile page, its API and its share image show.
 * Profiles flagged for cheating keep their identity but never list solved work.
 */
// The first three digits of a Horus student ID are the intake year
// (824 = 2024 intake). For the 2026/27 year that maps to these levels.
const INTAKE_LEVEL: Record<string, string> = { '824': 'Level 3', '825': 'Level 2', '826': 'Level 1' };
function yearFromStudentId(studentId: string): string | null {
    return INTAKE_LEVEL[studentId.slice(0, 3)] ?? null;
}

export async function getPublicProfile(studentId: string): Promise<PublicProfileResult> {
    if (!/^\d{7,10}$/.test(studentId)) return { status: 'not_found' };

    return getCachedData(`public-profile:v4:${studentId}`, 60, async (): Promise<PublicProfileResult> => {
        const email = `${studentId}@horus.edu.eg`;
        const columns = `id, role, profile_visibility, show_public_profile, created_at, application_id,
                    profile_picture, codeforces_data, codeforces_handle, is_shadow_banned, cheating_flags,
                    to_jsonb(users) -> 'social_links' AS social_links`;
        let userResult = await query(`SELECT ${columns} FROM users WHERE email_blind_index = $1 LIMIT 1`, [createBlindIndex(email)]);

        // A few accounts have a blind index that was built from a different
        // spelling of the address. Fall back to comparing the decrypted email,
        // globally rate-limited because it reads every account.
        if (userResult.rows.length === 0 && (await rateLimit('profile-email-scan', 20, 60)).success) {
            const all = await query('SELECT id, email FROM users');
            const match = all.rows.find((u: { email: string | null }) => {
                try { return (decrypt(u.email) || '').trim().toLowerCase() === email; } catch { return false; }
            });
            if (match) userResult = await query(`SELECT ${columns} FROM users WHERE id = $1`, [match.id]);
        }

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
                name: name ? formatDisplayName(name) : '',
                role: user.role,
                faculty: application.faculty || null,
                studentLevel: yearFromStudentId(studentId) || application.student_level || null,
                joinedAt: user.created_at ? new Date(user.created_at).toISOString() : null,
                picture: user.profile_picture || null,
                codeforces: cfHandle ? { handle: cfHandle, rating: cf?.rating, maxRating: cf?.maxRating, rank: cf?.rank } : null,
                leetcode,
                socials: { ...(leetcode && toHandle(leetcode) ? { leetcode: toHandle(leetcode)! } : {}), ...cleanSocials(user.social_links) },
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
