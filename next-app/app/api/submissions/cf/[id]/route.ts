import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const submissionId = parseInt(id);

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
        }

        const result = await query(
            `SELECT 
                source_code, verdict, language, time_ms, memory_kb, cf_handle, 
                cf_submission_id, contest_id, problem_index, submitted_at, 
                compilation_error, details, test_number
             FROM cf_submissions
             WHERE id = $1 AND user_id = $2`,
            [submissionId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const row = result.rows[0];

        return NextResponse.json({
            success: true,
            sourceCode: row.source_code,
            verdict: row.verdict,
            language: row.language,
            timeMs: row.time_ms,
            memoryKb: row.memory_kb,
            cfHandle: row.cf_handle,
            cfSubmissionId: row.cf_submission_id,
            contestId: row.contest_id,
            problemIndex: row.problem_index,
            submittedAt: row.submitted_at,
            compilationError: row.compilation_error,
            details: row.details,
            testNumber: row.test_number,
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
