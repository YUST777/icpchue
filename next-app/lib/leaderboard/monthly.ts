import { query } from '@/lib/db/db';
import { formatDisplayName } from '@/lib/names';
import { grantAchievement } from '@/lib/services/achievements';
import { LEVEL_2_USER_IDS, cohortClause, decryptName, ecpcTeamUserIds, safeDecrypt } from '@/lib/leaderboard/cohort';

// The Level 0 intake started training in October 2026; earlier months belong to the previous season.
const LEVEL0_MONTHLY_START = '2026-10-01';
const CAIRO = 'Africa/Cairo';

export interface PodiumEntry {
    rank: 1 | 2 | 3;
    userId: number;
    username: string;
    studentId: string | null;
    solved: number;
}

export interface MonthlyPodium {
    month: string;       // YYYY-MM
    label: string;       // October 2026
    complete: boolean;   // false while the month is still running
    top: PodiumEntry[];
}

function monthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The three students who solved the most distinct problems in each month, among the
 * Level 0 cohort (everyone not on a Level 1 team). Finished months also award a podium badge.
 */
export async function getLevel0MonthlyPodiums(): Promise<MonthlyPodium[]> {
    const teamIds = await ecpcTeamUserIds();
    const result = await query(
        `SELECT up.user_id AS id,
                to_char(date_trunc('month', up.solved_at AT TIME ZONE '${CAIRO}'), 'YYYY-MM') AS month,
                COUNT(DISTINCT up.problem_id) AS solved,
                MAX(up.solved_at) AS last_solve,
                u.email, u.profile_visibility, u.show_public_profile, a.name, a.student_id
         FROM user_progress up
         JOIN users u ON u.id = up.user_id
         LEFT JOIN applications a ON a.id = u.application_id
         WHERE up.status = 'SOLVED'
           AND up.solved_at IS NOT NULL
           AND up.solved_at >= $2::timestamptz
           AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)
           AND (u.show_on_sheets_leaderboard = TRUE OR u.show_on_sheets_leaderboard IS NULL)
           ${cohortClause(0)}
         GROUP BY up.user_id, month, u.email, u.profile_visibility, u.show_public_profile, a.name, a.student_id
         ORDER BY month DESC, solved DESC, last_solve ASC`,
        [teamIds, LEVEL0_MONTHLY_START]
    );

    const currentMonth = (await query(`SELECT to_char(now() AT TIME ZONE '${CAIRO}', 'YYYY-MM') AS m`)).rows[0].m as string;
    const byMonth = new Map<string, PodiumEntry[]>();
    for (const row of result.rows) {
        if (LEVEL_2_USER_IDS.has(Number(row.id))) continue;
        const list = byMonth.get(row.month) ?? [];
        if (list.length >= 3) continue;
        const isPublic = row.profile_visibility !== 'private' && row.show_public_profile !== false;
        let studentId: string | null = null;
        if (isPublic) {
            if (row.student_id && /^\d{7,10}$/.test(String(row.student_id))) studentId = String(row.student_id);
            else {
                const local = (safeDecrypt(row.email) || '').split('@')[0];
                if (/^\d{7,10}$/.test(local)) studentId = local;
            }
        }
        const raw = decryptName(row.name);
        list.push({
            rank: (list.length + 1) as 1 | 2 | 3,
            userId: Number(row.id),
            username: raw ? formatDisplayName(raw) : 'Member',
            studentId,
            solved: Number(row.solved),
        });
        byMonth.set(row.month, list);
    }

    const podiums: MonthlyPodium[] = [...byMonth.entries()].map(([month, top]) => ({
        month,
        label: monthLabel(month),
        complete: month < currentMonth,
        top,
    }));

    // Finished months award their podium badges (idempotent).
    for (const podium of podiums) {
        if (!podium.complete) continue;
        for (const entry of podium.top) await grantAchievement(entry.userId, `podium-${podium.month}-${entry.rank}`);
    }
    return podiums;
}
