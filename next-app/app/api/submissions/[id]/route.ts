import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { getProblem, getSheet } from '@/lib/problems';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify authentication
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const submissionId = parseInt(id);

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
        }

        // Fetch submission (only if belongs to user)
        const result = await query(
            `SELECT 
                ts.*,
                u.email as user_email
            FROM training_submissions ts
            JOIN users u ON ts.user_id = u.id
            WHERE ts.id = $1 AND ts.user_id = $2`,
            [submissionId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const row = result.rows[0];
        const problem = getProblem(row.sheet_id, row.problem_id);
        const sheet = getSheet(row.sheet_id);

        return NextResponse.json({
            success: true,
            submission: {
                id: row.id,
                sheetId: row.sheet_id,
                sheetTitle: sheet?.title || row.sheet_id,
                problemId: row.problem_id,
                problemTitle: problem?.title || 'Unknown',
                sourceCode: row.source_code,
                language: row.language || 'C++20 (GCC 13-64)',
                verdict: row.verdict,
                timeMs: row.time_ms,
                memoryKb: row.memory_kb,
                testsPassed: row.test_cases_passed,
                totalTests: row.total_test_cases,
                compileError: row.compile_error,
                runtimeError: row.runtime_error,
                submittedAt: row.submitted_at,
                notes: row.notes,
                noteColor: row.note_color,
                attemptNumber: row.attempt_number,
                tabSwitches: row.tab_switches,
                pasteEvents: row.paste_events,
                timeToSolve: row.time_to_solve_seconds,
                ipAddress: row.ip_address,
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

        // Determine if it is a training submission or cf submission
        // Since both have 'notes', we check training_submissions first
        const updateTraining = await query(
            'UPDATE training_submissions SET notes = $1, note_color = $2 WHERE id = $3 AND user_id = $4 RETURNING id',
            [notes, noteColor, submissionId, user.id]
        );

        if (updateTraining.rows.length === 0) {
            // Try cf_submissions
            const updateCf = await query(
                'UPDATE cf_submissions SET notes = $1, note_color = $2 WHERE id = $3 AND user_id = $4 RETURNING id',
                [notes, noteColor, submissionId, user.id]
            );

            if (updateCf.rows.length === 0) {
                return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Notes updated successfully'
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
