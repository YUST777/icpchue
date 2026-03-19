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
                    NULL AS contest_id,
                    ts.verdict,
                    ts.time_ms,
                    ts.memory_kb,
                    ts.test_cases_passed,
                    ts.total_test_cases,
                    ts.submitted_at,
                    ts.attempt_number,
                    ts.language,
                    'judge0' AS source,
                    NULL::bigint AS cf_submission_id,
                    ts.compile_error AS compilation_error,
                    NULL AS details,
                    NULL::integer AS test_number
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
                    cf.contest_id,
                    cf.verdict,
                    cf.time_ms,
                    cf.memory_kb,
                    NULL::integer AS test_cases_passed,
                    NULL::integer AS total_test_cases,
                    cf.submitted_at,
                    NULL::integer AS attempt_number,
                    cf.language,
                    'codeforces' AS source,
                    cf.cf_submission_id,
                    cf.compilation_error,
                    cf.details,
                    cf.test_number
                FROM cf_submissions cf
                WHERE cf.user_id = $1
                  AND cf.contest_id = $${pContest}
                  AND cf.problem_index = UPPER($${pIndex})
            `);
        } else if (sheetId && !problemId) {
            // Sheet-level Logic [V2]: 
            // 1. We find all problems that BELONG to this sheet
            // 2. We find ALL submissions for those problems by this user
            // This ensures that if a problem is in multiple sheets, solving it once marks it solved everywhere.
            
            const problemsRes = await query(
                `SELECT contest_id, problem_letter FROM curriculum_problems WHERE sheet_id = $1`,
                [sheetId]
            );

            if (problemsRes.rows.length > 0) {
                const problemFilters = problemsRes.rows.map((row: any) => 
                    `(cf.contest_id = '${row.contest_id}' AND cf.problem_index = '${row.problem_letter.toUpperCase()}')`
                ).join(' OR ');

                parts.push(`
                    SELECT
                        cf.id,
                        cf.problem_index AS problem_id,
                        cf.contest_id,
                        cf.verdict,
                        cf.time_ms,
                        cf.memory_kb,
                        NULL::integer AS test_cases_passed,
                        NULL::integer AS total_test_cases,
                        cf.submitted_at,
                        NULL::integer AS attempt_number,
                        cf.language,
                        'codeforces' AS source,
                        cf.cf_submission_id,
                        cf.compilation_error,
                        cf.details,
                        cf.test_number
                    FROM cf_submissions cf
                    WHERE cf.user_id = $1
                      AND (${problemFilters})
                `);
            }
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
            contestId: row.contest_id,
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
            compilationError: row.compilation_error,
            details: row.details,
            testNumber: row.test_number,
        }));

        return NextResponse.json({
            success: true,
            submissions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });

    } catch (error: any) {
        console.error('[API Submissions] Database error:', error.message);
        // If it's a connection or DB error, return empty instead of 500 to keep UI alive
        return NextResponse.json({ 
            success: true, 
            submissions: [], 
            pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
            error: 'DATABASE_UNAVAILABLE'
        });
    }
}
