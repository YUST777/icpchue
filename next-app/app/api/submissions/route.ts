import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sheetId = searchParams.get('sheetId');
        const problemId = searchParams.get('problemId');
        const contestId = searchParams.get('contestId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50);
        const offset = (page - 1) * limit;

        // ── Build unified query: training_submissions UNION ALL cf_submissions ──
        const parts: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any[] = [user.id];
        let p = 1; // param counter

        // ── Judge0 (training_submissions) ──
        // Supports: sheetId only (all problems) OR sheetId+problemId (single problem)
        if (sheetId) {
            p++;
            const pSheet = p;
            params.push(sheetId);

            let judge0Where = `ts.user_id = $1 AND ts.sheet_id = $${pSheet}`;
            if (problemId) {
                p++;
                const pProblem = p;
                params.push(problemId);
                judge0Where += ` AND ts.problem_id = $${pProblem}`;
            }

            parts.push(`
                SELECT
                    ts.id,
                    ts.problem_id,
                    ts.verdict,
                    ts.time_ms,
                    ts.memory_kb,
                    ts.test_cases_passed,
                    ts.total_test_cases,
                    ts.submitted_at,
                    ts.attempt_number,
                    ts.language,
                    'judge0' AS source,
                    NULL::bigint AS cf_submission_id
                FROM training_submissions ts
                WHERE ${judge0Where}
            `);
        }

        // ── Codeforces (cf_submissions) ──
        // Supports: contestId+problemId (single problem) OR sheetId only (all problems)
        if (contestId && problemId) {
            p++;
            const pContest = p;
            p++;
            const pIndex = p;
            params.push(contestId, problemId);

            parts.push(`
                SELECT
                    cf.id,
                    cf.problem_index AS problem_id,
                    cf.verdict,
                    cf.time_ms,
                    cf.memory_kb,
                    NULL::integer AS test_cases_passed,
                    NULL::integer AS total_test_cases,
                    cf.submitted_at,
                    NULL::integer AS attempt_number,
                    cf.language,
                    'codeforces' AS source,
                    cf.cf_submission_id
                FROM cf_submissions cf
                WHERE cf.user_id = $1
                  AND cf.contest_id = $${pContest}
                  AND cf.problem_index = UPPER($${pIndex})
            `);
        } else if (sheetId && !problemId) {
            // Sheet-level: get ALL CF submissions for this sheet
            // cf_submissions stores the DB sheet_id in sheet_id column
            p++;
            const pCfSheet = p;
            params.push(sheetId);

            parts.push(`
                SELECT
                    cf.id,
                    cf.problem_index AS problem_id,
                    cf.verdict,
                    cf.time_ms,
                    cf.memory_kb,
                    NULL::integer AS test_cases_passed,
                    NULL::integer AS total_test_cases,
                    cf.submitted_at,
                    NULL::integer AS attempt_number,
                    cf.language,
                    'codeforces' AS source,
                    cf.cf_submission_id
                FROM cf_submissions cf
                WHERE cf.user_id = $1
                  AND cf.sheet_id = $${pCfSheet}::varchar
            `);
        }

        if (parts.length === 0) {
            return NextResponse.json({ success: true, submissions: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }

        // Single query: data + total count via window function (no separate count query)
        p++;
        const pLimit = p;
        p++;
        const pOffset = p;
        params.push(limit, offset);

        const dataQuery = `
            SELECT *, COUNT(*) OVER() AS total_count
            FROM (${parts.join(' UNION ALL ')}) AS unified
            ORDER BY submitted_at DESC
            LIMIT $${pLimit} OFFSET $${pOffset}
        `;
        const result = await query(dataQuery, params);

        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submissions = result.rows.map((row: any) => ({
            id: row.id,
            problemId: row.problem_id,
            verdict: row.verdict,
            timeMs: row.time_ms ?? 0,
            memoryKb: row.memory_kb ?? 0,
            testsPassed: row.test_cases_passed,
            totalTests: row.total_test_cases,
            submittedAt: row.submitted_at,
            attemptNumber: row.attempt_number,
            language: row.language || 'C++20 (GCC 13-64)',
            source: row.source,
            cfSubmissionId: row.cf_submission_id,
        }));

        return NextResponse.json({
            success: true,
            submissions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
