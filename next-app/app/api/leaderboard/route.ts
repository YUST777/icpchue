import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';

// Extract first and last name, handling compound family names (Al-, Abd-, El-, etc.)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);
    if (parts.length <= 2) return cleaned.trim();
    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;
    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        return `${firstName} ${secondToLast} ${lastPart}`;
    }
    if (/^(al|el|abd|abu)-/i.test(lastPart)) {
        return `${firstName} ${lastPart}`;
    }
    return `${firstName} ${lastPart}`;
}

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

export async function GET() {
    try {

        const headers = {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            'Vary': 'Accept-Encoding'
        };

        const leaderboard = await getCachedData('leaderboard:codeforces', 300, async () => {
            // Optimized query: Move rating extraction and sorting to database
            // We use a CTE to combine and then sort/limit efficiently
            const result = await query(`
                WITH combined_users AS (
                    SELECT 
                        name, 
                        codeforces_profile,
                        codeforces_data,
                        (codeforces_data->>'handle') as handle,
                        COALESCE((codeforces_data->>'rating')::int, 0) as rating
                    FROM applications 
                    WHERE codeforces_data IS NOT NULL
                    
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
                )
                SELECT DISTINCT ON (handle) *
                FROM combined_users
                WHERE rating > 0
                ORDER BY handle, rating DESC
            `);

            // Since DISTINCT ON requires the first ORDER BY to match the DISTINCT column,
            // we sort by handle first, then rating. To get the actual top users, 
            // we sort in memory (on a much smaller dataset) or use a subquery.
            // A subquery is cleaner:
            
            const finalResult = await query(`
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
                        FROM applications 
                        WHERE codeforces_data IS NOT NULL
                        
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

            return finalResult.rows.map((row: any) => {
                const data = row.codeforces_data || {};
                return {
                    name: getShortName(row.name),
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
