import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getCachedData } from '@/lib/cache/cache';

// Extract first and last name, handling compound family names (Al-, Abd-, El-, etc.)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';

    // Clean up mixed format like "nabila / نبيلة"
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);

    if (parts.length <= 2) return cleaned.trim();

    const firstName = parts[0];

    // Check if last part is a compound name prefix (Al-, Abd-, El-)
    // In that case, include the previous part as part of the family name
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;

    // Common compound prefixes: Al, El, Abd, Abu, Ben, Ibn
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;

    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        // Family name is compound (e.g., "Al Basuony" or "Abd Elhameed")
        return `${firstName} ${secondToLast} ${lastPart}`;
    }

    // Check if last part itself starts with a compound (e.g., "Al-Basuony")
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
        // Rate-limit global leaderboard access to prevent scraping
        const limitResult = await rateLimit('leaderboard-global', 60, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
        }

        // Disable caching
        const headers = {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        // Use centralized caching (TTL 300s = 5 mins)
        const leaderboard = await getCachedData('leaderboard:codeforces', 300, async () => {
            // Get users with codeforces data from BOTH applications AND users tables
            const result = await query(`
                SELECT DISTINCT ON (COALESCE(handle, name)) 
                    name, 
                    handle,
                    codeforces_profile, 
                    codeforces_data
                FROM (
                    -- From applications table (legacy, no privacy filter)
                    SELECT 
                        name, 
                        codeforces_profile,
                        codeforces_data,
                        (codeforces_data::json->>'handle') as handle
                    FROM applications 
                    WHERE codeforces_data IS NOT NULL
                    
                    UNION ALL
                    
                    -- From users table (respects privacy unless shadow banned)
                    SELECT 
                        COALESCE(a.name, u.email) as name,
                        u.codeforces_handle as codeforces_profile,
                        u.codeforces_data,
                        (u.codeforces_data::json->>'handle') as handle
                    FROM users u
                    LEFT JOIN applications a ON u.application_id = a.id
                    WHERE u.codeforces_data IS NOT NULL
                      AND (u.show_on_cf_leaderboard = TRUE OR u.show_on_cf_leaderboard IS NULL)
                      AND (u.is_shadow_banned IS NULL OR u.is_shadow_banned = FALSE)
                ) combined
                ORDER BY COALESCE(handle, name)
            `);

            type LeaderboardRow = {
                name: string | null;
                handle: string | null;
                codeforces_profile: string | null;
                codeforces_data: string | Record<string, unknown>;
            };

            type CodeforcesData = {
                rating?: string | number;
                maxRating?: string | number;
                rank?: string;
            };

            type LeaderboardUser = {
                name: string;
                handle: string;
                rating: number;
                rank: string;
                maxRating: number;
                profileUrl: string | null;
            };

            return result.rows.map((row: LeaderboardRow): LeaderboardUser => {
                let data: CodeforcesData = {};
                try {
                    data = typeof row.codeforces_data === 'string' ? JSON.parse(row.codeforces_data) : row.codeforces_data as CodeforcesData;
                } catch {
                    data = {};
                }

                const rating = parseInt(String(data.rating || 0), 10);
                const username = row.handle || extractUsername(row.codeforces_profile || '', 'codeforces') || '?';

                return {
                    name: getShortName(row.name),
                    handle: username,
                    rating: rating,
                    rank: data.rank || 'unrated',
                    maxRating: parseInt(String(data.maxRating || 0), 10),
                    profileUrl: row.codeforces_profile
                };
            })
                .filter((user: LeaderboardUser) => user.rating > 0)
                .sort((a: LeaderboardUser, b: LeaderboardUser) => b.rating - a.rating);
        });

        return NextResponse.json({ success: true, leaderboard }, { headers });
    } catch (error) {
        return NextResponse.json({ success: false, leaderboard: [], error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
