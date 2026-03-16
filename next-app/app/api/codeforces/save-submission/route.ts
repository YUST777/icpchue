import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/cache';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/codeforces/save-submission
 * 
 * Saves a Codeforces submission and its verdict to the database.
 * Called from the client after polling detects a final verdict.
 * 
 * This is the AUTHORITY for leaderboard & achievements:
 * - Saves to cf_submissions (full submission history)
 * - Updates user_progress (SOLVED/ATTEMPTED tracking)
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate-limit per user to prevent client-side replay loops
        const limitResult = await rateLimit(`cf-save:${user.id}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many submission saves. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        const {
            cfSubmissionId,
            contestId,
            problemIndex,
            sheetId,
            verdict,
            timeMs,
            memoryKb,
            language,
            sourceCode,
            cfHandle,
            urlType,
            groupId,
        } = body;

        if (!cfSubmissionId || !contestId || !problemIndex || !verdict) {
            return NextResponse.json({ error: 'Missing required fields: cfSubmissionId, contestId, problemIndex, verdict' }, { status: 400 });
        }

        const validPrefixes = [
            'accepted', 'ok', 'wrong answer', 'time limit exceeded', 'memory limit exceeded',
            'runtime error', 'compilation error', 'challenged', 'skipped', 'partial',
            'idleness limit exceeded'
        ];
        const verdictLower = verdict.toLowerCase();
        
        if (!validPrefixes.some(p => verdictLower.includes(p))) {
            return NextResponse.json({ error: `Non-final verdict rejected: ${verdict}` }, { status: 400 });
        }

        // 1. Save to cf_submissions (upsert on cf_submission_id to prevent duplicates)
        const insertResult = await query(
            `INSERT INTO cf_submissions (
                user_id, cf_submission_id, contest_id, problem_index, sheet_id,
                verdict, time_ms, memory_kb, language, source_code,
                cf_handle, url_type, group_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (cf_submission_id) DO UPDATE SET
                verdict = EXCLUDED.verdict,
                time_ms = EXCLUDED.time_ms,
                memory_kb = EXCLUDED.memory_kb
            RETURNING id`,
            [
                user.id,
                cfSubmissionId,
                contestId,
                problemIndex.toUpperCase(),
                sheetId || null,
                verdict,
                timeMs || 0,
                memoryKb || 0,
                language || null,
                sourceCode || null,
                cfHandle || null,
                urlType || 'contest',
                groupId || null,
            ]
        );

        const savedId = insertResult.rows[0]?.id;

        // 2. Update user_progress (the source of truth for "did user solve this?")
        //    trackingProblemId format: "contestId:problemIndex" — matches roadmap & sync scripts
        const trackingProblemId = `${contestId}:${problemIndex.toUpperCase()}`;
        const isAc = verdictLower.includes('accepted') || verdictLower === 'ok';
        const status = isAc ? 'SOLVED' : 'ATTEMPTED';

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
            cfSubmissionId,
            status === 'SOLVED' ? new Date() : null
        ]);

        if (status === 'SOLVED') {
            await invalidateCache(`user:${user.id}:dashboard_stats`);
            await invalidateCache(`user:${user.id}:roadmap`);
            await invalidateCache(`user:${user.id}:achievements`);
            await invalidateCache(`user:${user.id}:curriculum_progress`);
            await invalidateCache('leaderboard:sheets:public');

            if (sheetId) {
                // Invalidate specific sheet and details cache
                const levelRes = await query(`
                    SELECT 
                        l.slug AS level_slug, l.level_number,
                        s.slug AS sheet_slug, s.sheet_number, s.id as sheet_id_raw
                    FROM curriculum_levels l
                    JOIN curriculum_sheets s ON s.level_id = l.id
                    WHERE s.id::text = $1
                `, [sheetId]);

                if (levelRes.rows.length > 0) {
                    const { level_slug, sheet_slug, level_number, sheet_number, sheet_id_raw } = levelRes.rows[0];
                    await invalidateCache(`user:${user.id}:sheets:${level_slug}`);
                    await invalidateCache(`user:${user.id}:details:${level_slug}:${sheet_slug}`);

                    // --- Achievement Logic: Sheet 1 Completion ---
                    try {
                        const progressCheck = await query(`
                            SELECT 
                                (SELECT total_problems FROM curriculum_sheets WHERE id = $1) as total,
                                (SELECT COUNT(*) FROM user_progress WHERE user_id = $2 AND sheet_id = $1::text AND status = 'SOLVED') as solved
                        `, [sheet_id_raw, user.id]);

                        const { total, solved } = progressCheck.rows[0];
                        if (total > 0 && solved >= total) {
                            // Sheet 1 Achievement is for Level 0 (Newcomers) or Level 1 first sheet
                            if ((level_number === 0 || level_number === 1) && sheet_number === 1) {
                                const { updateUserStatus } = await import('@/lib/achievements');
                                await updateUserStatus(user.id, 'sheet_1_solved', true);
                            }
                        }
                    } catch (e) {
                        console.error('Achievement check failed:', e);
                    }
                }
            }
        }


        const { syncRank1Achievement } = await import('@/lib/achievements');
        await syncRank1Achievement('submission');

        return NextResponse.json({
            success: true,
            id: savedId,
            status,
            trackingProblemId
        });

    } catch (error: unknown) {
        // Handle unique constraint violation gracefully (duplicate submission)
        if (error instanceof Error && error.message?.includes('cf_submissions_cf_id_unique')) {
            return NextResponse.json({ success: true, duplicate: true });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
