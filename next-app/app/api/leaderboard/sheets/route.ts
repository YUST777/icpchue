import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

// Extract first and last name, handling compound family names (Al-, Abd-, El-, etc.)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';

    // Clean up mixed format like "nabila / نبيلة"
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);

    if (parts.length <= 2) return cleaned.trim();

    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;

    // Common compound prefixes: Al, El, Abd, Abu, Ben, Ibn
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;

    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        return `${firstName} ${secondToLast} ${lastPart}`;
    }

    if (/^(al|el|abd|abu)-/i.test(lastPart)) {
        return `${firstName} ${lastPart}`;
    }

    return `${firstName} ${lastPart}`;
}

export async function GET(req: NextRequest) {
    try {
        // Try to get current user (optional - works for both auth and non-auth requests)
        let currentUser: { id: number } | null = null;
        let isShadowBanned = false;

        try {
            currentUser = await verifyAuth(req);
            if (currentUser) {
                // Check if user is shadow banned
                const userCheck = await query(
                    `SELECT is_shadow_banned FROM users WHERE id = $1`,
                    [currentUser.id]
                );
                isShadowBanned = userCheck.rows[0]?.is_shadow_banned === true;
            }
        } catch {
            // Not authenticated - that's fine for leaderboard
        }

        // Check Cache (only for public view, i.e., non-shadow-banned users)
        // If shadow-banned (admin/cheater view), we bypassing cache to show real-time restricted data found nowhere else
        if (isShadowBanned) {
            return await fetchLeaderboard(true);
        }

        // Use centralized caching for public view
        const data = await getCachedData('leaderboard:sheets:public', 300, async () => {
            return await fetchLeaderboard(false);
        });

        return NextResponse.json(data);

    } catch (error) {
        return NextResponse.json({
            success: false,
            leaderboard: [],
            error: 'Failed to fetch leaderboard'
        }, { status: 500 });
    }
}

async function fetchLeaderboard(isShadowBanned: boolean) {
    const shadowBanClause = isShadowBanned
        ? ''
        : 'AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)';

    // Uses pre-computed user_solve_stats (auto-updated by trigger on submissions table)
    // No more scanning all cf_submissions on every leaderboard load
    const queryStr = `
        SELECT 
            u.id,
            u.email,
            u.profile_visibility,
            u.is_shadow_banned,
            a.name,
            uss.distinct_solved AS solved_count,
            uss.total_accepted AS accepted_count,
            uss.total_submissions
        FROM users u
        INNER JOIN user_solve_stats uss ON u.id = uss.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE uss.distinct_solved > 0
          AND (
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
          )
          ${shadowBanClause}
        ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC, uss.last_solve_at ASC
        LIMIT 100
    `;

    const result = await query(queryStr);

    type LeaderboardRow = {
        id: number;
        name: string | null;
        email: string | null;
        solved_count: string;
        accepted_count: string;
        total_submissions: string;
    };

    const leaderboard = result.rows.map((row: LeaderboardRow) => ({
        userId: row.id,
        username: getShortName(row.name) || row.email?.split('@')[0] || 'Anonymous',
        solvedCount: parseInt(row.solved_count) || 0,
        totalSubmissions: parseInt(row.total_submissions) || 0,
        acceptedCount: parseInt(row.accepted_count) || 0,
    }));

    return {
        success: true,
        leaderboard
    };
}

