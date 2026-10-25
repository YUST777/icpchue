import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { formatDisplayName } from '@/lib/names';
import { type Level, LEVEL_2_USER_IDS, cohortClause, decryptName, ecpcTeamUserIds, safeDecrypt } from '@/lib/leaderboard/cohort';

export async function GET(req: NextRequest) {
    try {
        const level: Level = req.nextUrl.searchParams.get('level') === '1' ? 1 : 0;
        let currentUser: { id: number } | null = null;
        let isShadowBanned = false;

        try {
            currentUser = await verifyAuth(req);
            if (currentUser) {
                const userCheck = await query(
                    `SELECT is_shadow_banned FROM users WHERE id = $1`,
                    [currentUser.id]
                );
                isShadowBanned = userCheck.rows[0]?.is_shadow_banned === true;
            }
        } catch {
            // Unauthenticated
        }

        // Cache public view for 10 minutes
        if (isShadowBanned) {
            const data = await fetchLeaderboard(true, level);
            return NextResponse.json(data);
        }

        const data = await getCachedData(`leaderboard:sheets:public:v8:level${level}`, 600, async () => {
            return await fetchLeaderboard(false, level);
        });

        return NextResponse.json(data);

    } catch (error) {
        console.error('[SheetsLeaderboard] Error:', error);
        return NextResponse.json({
            success: false,
            leaderboard: [],
            error: 'Failed to fetch leaderboard'
        }, { status: 500 });
    }
}

async function fetchLeaderboard(isShadowBanned: boolean, level: Level) {
    const params = [await ecpcTeamUserIds()];
    const shadowBanClause = isShadowBanned
        ? ''
        : 'AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)';

    const queryStr = `
        SELECT 
            u.id,
            u.email,
            u.profile_visibility,
            u.show_public_profile,
            u.is_shadow_banned,
            a.name,
            a.student_id,
            uss.distinct_solved AS solved_count,
            uss.total_accepted AS accepted_count,
            uss.total_submissions
        FROM users u
        INNER JOIN user_solve_stats uss ON u.id = uss.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE uss.distinct_solved > 0
          AND uss.season_year = (SELECT year FROM seasons WHERE is_current LIMIT 1)
          ${cohortClause(level)}
          AND (
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
          )
          ${shadowBanClause}
        ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC, uss.last_solve_at ASC
        LIMIT 200
    `;

    const result = await query(queryStr, params);

    const leaderboard = result.rows
        .filter((row: { id: string | number }) => !LEVEL_2_USER_IDS.has(Number(row.id)))
        .map((row: any) => {
            const rawName = decryptName(row.name);
            const displayName = rawName ? formatDisplayName(rawName) : 'Member';

            const isPublic = row.profile_visibility !== 'private' && row.show_public_profile !== false;
            let studentId: string | null = null;
            if (isPublic) {
                if (row.student_id && /^\d{7,10}$/.test(String(row.student_id))) {
                    studentId = String(row.student_id);
                } else {
                    const localPart = (safeDecrypt(row.email) || '').split('@')[0];
                    if (/^\d{7,10}$/.test(localPart)) studentId = localPart;
                }
            }

            return {
                userId: row.id,
                username: displayName,
                studentId,
                solvedCount: parseInt(row.solved_count) || 0,
                totalSubmissions: parseInt(row.total_submissions) || 0,
                acceptedCount: parseInt(row.accepted_count) || 0,
            };
        });

    return {
        success: true,
        leaderboard
    };
}
