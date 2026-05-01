import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { getProblem, getSheet } from '@/lib/content/problems';

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

        // Fetch from unified submissions table
        const result = await query(
            `SELECT s.*, u.email as user_email
             FROM submissions s
             JOIN users u ON s.user_id = u.id
             WHERE s.id = $1 AND s.user_id = $2`,
            [submissionId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const row = result.rows[0];
        const problem = getProblem(row.sheet_id, row.problem_index);
        const sheet = getSheet(row.sheet_id);

        return NextResponse.json({
            success: true,
            submission: {
                id: row.id,
                sheetId: row.sheet_id,
                sheetTitle: sheet?.title || row.sheet_id,
                problemId: row.problem_index,
                problemTitle: problem?.title || 'Unknown',
                sourceCode: row.source_code,
                language: row.language || 'C++20 (GCC 13-64)',
                verdict: row.verdict,
                timeMs: row.time_ms,
                memoryKb: row.memory_kb,
                testsPassed: row.test_cases_passed,
                totalTests: row.total_test_cases,
                compileError: row.compilation_error,
                runtimeError: row.runtime_error,
                submittedAt: row.submitted_at,
                notes: row.notes,
                noteColor: row.note_color,
                attemptNumber: row.attempt_number,
                tabSwitches: row.tab_switches,
                pasteEvents: row.paste_events,
                timeToSolve: row.time_to_solve_seconds,
                ipAddress: row.ip_address,
                source: row.source,
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
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
        const { notes, noteColor } = await req.json();

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
        }

        // Update in unified submissions table
        const result = await query(
            'UPDATE submissions SET notes = $1, note_color = $2 WHERE id = $3 AND user_id = $4 RETURNING id',
            [notes, noteColor, submissionId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Notes updated successfully' });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
