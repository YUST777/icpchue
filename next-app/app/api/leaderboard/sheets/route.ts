import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getCachedData } from '@/lib/cache';

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
    // Privacy filter: cheaters can't hide, normal users can opt out
    // is_shadow_banned = TRUE -> always shown (can't hide)
    // otherwise respects show_on_sheets_leaderboard setting

    // Note: Parameterized query logic moved here
    const shadowBanClause = isShadowBanned
        ? '' // Cheaters see everyone (including other cheaters)
        : 'AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)'; // Normal users don't see cheaters

    // Unified leaderboard: counts problems solved via BOTH Judge0 (training_submissions)
    // and Codeforces (cf_submissions). A problem is "solved" if EITHER source has Accepted.

    // Explanation of problem key collision handling:
    // Judge0 uses "sheetId-problemId"
    // Codeforces uses "contestId-problemIndex" or "sheetId-problemIndex"
    // We assume minimal collision since sheet IDs are integers and contest IDs are integers but separate domains usually.
    // Ideally we should unify problem IDs better in schema.

    const queryStr = `
        WITH all_solves AS (
            -- Codeforces solves are the only ones that count for the leaderboard
            -- We group by user_id and problem key to count distinct solves
            SELECT user_id, contest_id || '-' || problem_index AS problem_key, submitted_at, id AS sub_id
            FROM cf_submissions
            WHERE verdict = 'Accepted'
        ),
        user_stats AS (
            SELECT 
                user_id,
                COUNT(DISTINCT problem_key) AS solved_count,
                COUNT(sub_id) AS accepted_count,
                MAX(submitted_at) AS last_solve_at
            FROM all_solves
            GROUP BY user_id
        ),
        sub_counts AS (
            -- Total submissions from Codeforces only
            SELECT user_id, COUNT(*)::int AS total_submissions
            FROM cf_submissions
            GROUP BY user_id
        )
        SELECT 
            u.id,
            u.email,
            u.profile_visibility,
            u.is_shadow_banned,
            a.name,
            us.solved_count,
            us.accepted_count,
            COALESCE(sc.total_submissions, 0) AS total_submissions
        FROM users u
        INNER JOIN user_stats us ON u.id = us.user_id
        LEFT JOIN sub_counts sc ON u.id = sc.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE (
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
        )
          ${shadowBanClause}
        ORDER BY us.solved_count DESC, COALESCE(sc.total_submissions, 0) ASC, us.last_solve_at ASC
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

