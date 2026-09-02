import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { parseCodeforcesUrl } from '@/lib/services/codeforces-backfill';

export const dynamic = 'force-dynamic';

/**
 * GET /api/codeforces/backfill-plan
 *
 * Builds the plan for a full "backfill from Codeforces" run: every training
 * sheet/contest the curriculum contains, with the (contestId, groupId, urlType)
 * needed to read it, plus the list of problem indices the user has NOT solved
 * yet. All targets are returned even when solved: the tries system needs the
 * complete historical verdict stream, not only new ACs.
 */

// Derive { urlType, groupId } from a Codeforces contest URL.
// e.g. https://codeforces.com/group/MWSDmqGsZm/contest/219158  -> group, MWSDmqGsZm
//      https://codeforces.com/gym/104000                       -> gym, null
//      https://codeforces.com/contest/1700                     -> contest, null
function deriveFromUrl(contestUrl: string | null, fallbackGroupId: string | null) {
    let urlType: 'contest' | 'group' | 'gym' = 'contest';
    let groupId: string | null = fallbackGroupId || null;

    if (contestUrl) {
        const groupMatch = contestUrl.match(/\/group\/([^/]+)\//);
        if (groupMatch) {
            urlType = 'group';
            groupId = groupMatch[1];
        } else if (/\/gym\//.test(contestUrl)) {
            urlType = 'gym';
        }
    } else if (fallbackGroupId) {
        urlType = 'group';
    }

    return { urlType, groupId };
}

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rl = await rateLimit(`cf-backfill-plan:${user.id}`, 10, 60);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
        }

        // Pull every sheet + its problems, and whether THIS user has solved each.
        // group_id column may or may not be populated; we also keep contest_url
        // to derive urlType/groupId reliably.
        const result = await query(`
            SELECT
                s.id              AS sheet_id,
                s.name            AS sheet_name,
                s.slug            AS sheet_slug,
                s.contest_id      AS contest_id,
                s.contest_url     AS contest_url,
                s.group_id        AS group_id,
                l.level_number    AS level_number,
                l.slug            AS level_slug,
                p.problem_letter  AS problem_letter,
                p.contest_id      AS problem_contest_id,
                p.codeforces_url  AS codeforces_url,
                up.status         AS status
            FROM curriculum_sheets s
            JOIN curriculum_levels l ON s.level_id = l.id
            JOIN curriculum_problems p ON p.sheet_id = s.id
            LEFT JOIN user_progress up
                ON up.user_id = $1
               AND up.problem_id = (s.contest_id || ':' || p.problem_letter)
            WHERE s.contest_id IS NOT NULL
            ORDER BY l.level_number ASC, s.sheet_number ASC, p.problem_number ASC
        `, [user.id]);

        // Group rows by sheet.
        const sheetsMap = new Map<string, {
            sheetId: string;
            sheetName: string;
            sheetSlug: string;
            levelSlug: string;
            contestId: string;
            urlType: string;
            groupId: string | null;
            unsolved: string[];
            solvedCount: number;
            totalCount: number;
        }>();

        for (const row of result.rows) {
            const problemTarget = parseCodeforcesUrl(row.codeforces_url);
            const canonicalContestId = String(problemTarget?.contestId || row.problem_contest_id || row.contest_id || '').trim();
            if (!canonicalContestId) continue;
            // A sheet can contain legacy links from more than one contest. Do
            // not let the first row hide the other contest's submissions.
            const key = `${row.sheet_id}|${canonicalContestId}|${problemTarget?.urlType || ''}|${problemTarget?.groupId || row.group_id || ''}`;
            if (!sheetsMap.has(key)) {
                const fromProblemUrl = problemTarget;
                const { urlType, groupId } = fromProblemUrl || deriveFromUrl(row.contest_url, row.group_id);
                sheetsMap.set(key, {
                    sheetId: String(row.sheet_id),
                    sheetName: row.sheet_name,
                    sheetSlug: row.sheet_slug,
                    levelSlug: row.level_slug,
                    contestId: canonicalContestId,
                    urlType,
                    groupId,
                    unsolved: [],
                    solvedCount: 0,
                    totalCount: 0,
                });
            }
            const sheet = sheetsMap.get(key)!;
            sheet.totalCount++;
            if (row.status === 'SOLVED') {
                sheet.solvedCount++;
            } else {
                sheet.unsolved.push(String(row.problem_letter).toUpperCase());
            }
        }

        // Return every Codeforces target, including fully solved sheets. The
        // tries view needs failed attempts for problems that were later
        // solved, so filtering those sheets would silently lose history.
        const sheets = Array.from(sheetsMap.values());

        const totalUnsolved = sheets.reduce((acc, s) => acc + s.unsolved.length, 0);

        return NextResponse.json({
            success: true,
            sheets,
            totalSheetsToScan: sheets.length,
            totalUnsolved,
        });
    } catch (err: any) {
        console.error('[Backfill Plan] error:', err);
        return NextResponse.json({ error: 'Failed to build backfill plan' }, { status: 500 });
    }
}
