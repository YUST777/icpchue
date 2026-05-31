import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

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

        // Build WHERE conditions dynamically
        const conditions: string[] = ['s.user_id = $1'];
        const params: unknown[] = [user.id];
        let p = 1;

        if (contestId && problemId) {
            // Single problem by contest
            p++; conditions.push(`s.contest_id = $${p}`); params.push(contestId);
            p++; conditions.push(`s.problem_index = UPPER($${p})`); params.push(problemId);
        } else if (sheetId && problemId) {
            // Single problem by sheet + problemId (Judge0 path)
            p++; conditions.push(`s.sheet_id = $${p}`); params.push(sheetId);
            p++; conditions.push(`s.problem_index = $${p}`); params.push(problemId);
        } else if (sheetId) {
            // OPTIMIZED: Filter by sheet_id directly. 
            // In the unified table, all curriculum-related submissions (both CF and Judge0) 
            // should have sheet_id set for efficiency.
            p++; conditions.push(`s.sheet_id = $${p}`); params.push(sheetId);
        } else {
            return NextResponse.json({ success: true, submissions: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }

        p++; const pLimit = p; params.push(limit);
        p++; const pOffset = p; params.push(offset);

        const dataQuery = `
            SELECT s.*, COUNT(*) OVER() AS total_count
            FROM submissions s
            WHERE ${conditions.join(' AND ')}
            ORDER BY s.submitted_at DESC
            LIMIT $${pLimit} OFFSET $${pOffset}
        `;
        const result = await query(dataQuery, params);

        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        const submissions = result.rows.map((row: Record<string, unknown>) => ({
            id: row.id,
            problemId: row.problem_index,
            contestId: row.contest_id,
            verdict: row.verdict,
            timeMs: (row.time_ms as number) ?? 0,
            memoryKb: (row.memory_kb as number) ?? 0,
            testsPassed: row.test_cases_passed,
            totalTests: row.total_test_cases,
            submittedAt: row.submitted_at,
            attemptNumber: row.attempt_number,
            language: (row.language as string) || 'C++20 (GCC 13-64)',
            source: row.source,
            cfSubmissionId: row.cf_submission_id,
            compilationError: row.compilation_error,
            details: row.details,
            testNumber: row.test_number,
            notes: row.notes,
            noteColor: row.note_color,
        }));

        return NextResponse.json({
            success: true,
            submissions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[API Submissions] Error:', msg);
        return NextResponse.json({ 
            success: false, 
            submissions: [], 
            pagination: { page: 1, limit: 30, total: 0, totalPages: 0 },
            error: 'Failed to load submissions'
        }, { status: 500 });
    }
}
