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

        // Submission history is stored in the unified table. The old
        // cf_submissions table is retained only for migration/rollback and
        // does not contain rows imported by the current backfill service.
        const result = await query(
            `SELECT
                source_code, verdict, language, time_ms, memory_kb, cf_handle,
                cf_submission_id, contest_id, problem_index, submitted_at,
                compilation_error, details, test_number, url_type, group_id,
                source
             FROM submissions
             WHERE id = $1 AND user_id = $2 AND source = 'codeforces'`,
            [submissionId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const row = result.rows[0];

        return NextResponse.json({
            success: true,
            id: submissionId,
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
            urlType: row.url_type || 'contest',
            groupId: row.group_id,
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Store source fetched from the user's authenticated Codeforces session.
 * This is deliberately ownership checked: a user can only attach source to
 * their own Codeforces submission, and the source is capped to the same size
 * accepted by the verification endpoint.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const submissionId = Number.parseInt(id, 10);
        if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
            return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
        }

        const body = await req.json();
        const sourceCode = body?.sourceCode;
        if (typeof sourceCode !== 'string' || sourceCode.length === 0 || sourceCode.length > 64 * 1024) {
            return NextResponse.json({ error: 'Invalid source code' }, { status: 400 });
        }

        const result = await query(
            `UPDATE submissions
             SET source_code = $1
             WHERE id = $2 AND user_id = $3 AND source = 'codeforces'
             RETURNING id`,
            [sourceCode, submissionId, user.id]
        );
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
