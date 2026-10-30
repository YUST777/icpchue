import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';
import { UNCOUNTED_USER_IDS } from '@/lib/achievements/factory';

export interface ServerHolderStats {
    total: number;
    counts: Record<string, number>;
}

export async function getServerHolderStats(): Promise<ServerHolderStats> {
    return getCachedData('achievements:holder-stats:v2', 600, async () => {
        const [totalRes, countRes] = await Promise.all([
            query(`SELECT COUNT(*)::int AS n FROM users WHERE (is_shadow_banned = FALSE OR is_shadow_banned IS NULL) AND id <> ALL($1::int[])`, [UNCOUNTED_USER_IDS]),
            query(
                `SELECT ua.achievement_id, COUNT(DISTINCT ua.user_id)::int AS n
                 FROM user_achievements ua
                 JOIN users u ON u.id = ua.user_id
                 WHERE (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL) AND u.id <> ALL($1::int[])
                 GROUP BY ua.achievement_id`,
                [UNCOUNTED_USER_IDS]
            ),
        ]);
        const counts: Record<string, number> = {};
        for (const row of countRes.rows) counts[row.achievement_id] = row.n;
        return { total: totalRes.rows[0]?.n ?? 0, counts };
    });
}
