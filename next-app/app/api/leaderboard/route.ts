import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';
import { decrypt } from '@/lib/security/encryption';
import { formatDisplayName } from '@/lib/names';

function extractUsername(profileUrl: string, platform: string): string | null {
    if (!profileUrl) return null;
    try {
        if (!profileUrl.includes('/') && !profileUrl.includes('.')) return profileUrl.trim();
        const url = new URL(profileUrl.includes('://') ? profileUrl : `https://${profileUrl}`);
        const parts = url.pathname.split('/').filter(Boolean);
        if (platform === 'codeforces') {
            const profileIndex = parts.indexOf('profile');
            if (profileIndex !== -1 && parts[profileIndex + 1]) return parts[profileIndex + 1];
            if (parts.length > 0) return parts[parts.length - 1];
        }
        return parts[parts.length - 1] || null;
    } catch {
        return profileUrl.trim();
    }
}

function safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try { return decrypt(value); } catch { return value; }
}

export async function GET() {
    try {

        const headers = {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'Vary': 'Accept-Encoding'
        };

        const leaderboard = await getCachedData('leaderboard:codeforces:v2', 300, async () => {
            // Deduplicate handles in the database, then return only the top 500.
            // Keep this as one request: the previous implementation executed an
            // identical, unused query before the result that was actually returned.
            const result = await query(`
                SELECT * FROM (
                    SELECT DISTINCT ON (handle) 
                        name, codeforces_profile, codeforces_data, handle, rating
                    FROM (
                        SELECT 
                            name, 
                            codeforces_profile,
                            codeforces_data,
                            (codeforces_data->>'handle') as handle,
                            COALESCE((codeforces_data->>'rating')::int, 0) as rating
                        FROM applications a
                        WHERE a.codeforces_data IS NOT NULL
                          AND NOT EXISTS (
                              SELECT 1 FROM users linked
                              WHERE linked.application_id = a.id
                          )
                        
                        UNION ALL
                        
                        SELECT 
                            COALESCE(a.name, u.email) as name,
                            u.codeforces_handle as codeforces_profile,
                            u.codeforces_data,
                            u.codeforces_handle as handle,
                            COALESCE((u.codeforces_data->>'rating')::int, 0) as rating
                        FROM users u
                        LEFT JOIN applications a ON u.application_id = a.id
                        WHERE u.codeforces_data IS NOT NULL
                          AND (u.show_on_cf_leaderboard = TRUE OR u.show_on_cf_leaderboard IS NULL)
                          AND (u.is_shadow_banned IS NULL OR u.is_shadow_banned = FALSE)
                    ) combined
                ) distinct_users
                WHERE rating > 0
                ORDER BY rating DESC
                LIMIT 500
            `);

            return result.rows.map((row: any) => {
                const data = row.codeforces_data || {};
                return {
                    name: formatDisplayName(safeDecrypt(row.name)),
                    handle: row.handle || extractUsername(row.codeforces_profile || '', 'codeforces') || '?',
                    rating: row.rating,
                    rank: data.rank || 'unrated',
                    maxRating: parseInt(String(data.maxRating || 0), 10),
                    profileUrl: row.codeforces_profile
                };
            });
        });

        return NextResponse.json({ success: true, leaderboard }, { headers });
    } catch (error) {
        console.error('[Leaderboard API] Error:', error);
        return NextResponse.json({ success: false, leaderboard: [], error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
