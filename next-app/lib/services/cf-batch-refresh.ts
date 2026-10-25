import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { extractUsername } from '@/lib/services/codeforces';
import { grantCodeforcesRankBadges } from '@/lib/services/achievements';

const CHUNK = 150;
const API = 'https://codeforces.com/api/user.info';

interface CfUser {
    handle: string; rating?: number; maxRating?: number; rank?: string; maxRank?: string;
    contribution?: number; friendOfCount?: number; lastOnlineTimeSeconds?: number; registrationTimeSeconds?: number;
}

/** One user.info call for many handles. A handle that does not exist fails the whole call, so drop it and retry. */
async function fetchChunk(handles: string[]): Promise<CfUser[]> {
    let remaining = handles;
    for (let attempt = 0; attempt < 8 && remaining.length > 0; attempt++) {
        const res = await fetch(`${API}?handles=${encodeURIComponent(remaining.join(';'))}`, { cache: 'no-store' });
        const body = await res.json().catch(() => null) as { status?: string; comment?: string; result?: CfUser[] } | null;
        if (body?.status === 'OK' && Array.isArray(body.result)) return body.result;
        const missing = /handle[s]?:? (?:User with handle )?(.+?) not found/i.exec(body?.comment || '')?.[1];
        if (!missing) return [];
        remaining = remaining.filter(h => h.toLowerCase() !== missing.toLowerCase());
    }
    return [];
}

/**
 * Refreshes stored Codeforces ratings for every student with a linked handle whose data is
 * missing or older than `maxAgeHours`, then awards the rank badges. One API call per ~150 students.
 */
export async function refreshCodeforcesRatings(maxAgeHours = 6): Promise<{ checked: number; updated: number }> {
    const rows = await query(
        `SELECT id, codeforces_handle FROM users
         WHERE codeforces_handle IS NOT NULL AND codeforces_handle <> ''
           AND (codeforces_data IS NULL
                OR (codeforces_data->>'lastUpdated') IS NULL
                OR (codeforces_data->>'lastUpdated')::timestamptz < now() - make_interval(hours => $1))`,
        [maxAgeHours]
    );

    const byHandle = new Map<string, number[]>();
    for (const row of rows.rows as { id: string; codeforces_handle: string }[]) {
        const handle = extractUsername(row.codeforces_handle, 'codeforces');
        if (!handle) continue;
        const key = handle.toLowerCase();
        byHandle.set(key, [...(byHandle.get(key) ?? []), Number(row.id)]);
    }

    const handles = [...byHandle.keys()];
    let updated = 0;
    for (let i = 0; i < handles.length; i += CHUNK) {
        const users = await fetchChunk(handles.slice(i, i + CHUNK));
        for (const u of users) {
            const data = {
                handle: u.handle,
                rating: u.rating || 0,
                maxRating: u.maxRating || 0,
                rank: u.rank || 'unrated',
                maxRank: u.maxRank || 'unrated',
                contribution: u.contribution || 0,
                friendOfCount: u.friendOfCount || 0,
                lastOnlineTimeSeconds: u.lastOnlineTimeSeconds,
                registrationTimeSeconds: u.registrationTimeSeconds,
                lastUpdated: new Date().toISOString(),
            };
            for (const userId of byHandle.get(u.handle.toLowerCase()) ?? []) {
                await query('UPDATE users SET codeforces_data = $1 WHERE id = $2', [JSON.stringify(data), userId]);
                await grantCodeforcesRankBadges(userId, Math.max(data.rating, data.maxRating));
                updated++;
            }
        }
        // Codeforces asks for no more than one request every two seconds.
        if (i + CHUNK < handles.length) await new Promise(r => setTimeout(r, 2200));
    }

    if (updated > 0) await invalidateCache('leaderboard:codeforces:v2');
    return { checked: handles.length, updated };
}
