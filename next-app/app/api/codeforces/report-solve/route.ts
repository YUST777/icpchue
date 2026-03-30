import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contestId, problemId, sheetId, status, submissionId } = await req.json();

        if (!contestId || !problemId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // trackingProblemId format: "contestId:problemId" or "sheetId:problemId"
        // Based on roadmap/route.ts and judge/submit/route.ts:
        // Roadmap uses (s.contest_id || ':' || p.problem_letter)
        // Judge/submit uses `${sheetId}:${problemId}`

        // However, the curriculum_problems table has contest_id and problem_letter.
        // Let's use the most reliable one: contestId:problemId if contestId is provided, 
        // else fallback to sheetId:problemId.

        const trackingProblemId = contestId.includes(':') ? contestId : `${contestId}:${problemId}`;

        await query(`
            INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET 
                status = CASE WHEN user_progress.status = 'SOLVED' THEN 'SOLVED' ELSE EXCLUDED.status END,
                submission_id = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.submission_id ELSE EXCLUDED.submission_id END,
                solved_at = CASE WHEN EXCLUDED.status = 'SOLVED' AND user_progress.status != 'SOLVED' THEN EXCLUDED.solved_at ELSE user_progress.solved_at END
        `, [
            user.id,
            trackingProblemId,
            sheetId || null,
            status,
            submissionId || null,
            status === 'SOLVED' ? new Date() : null
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
