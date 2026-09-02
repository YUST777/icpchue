import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';


/**
 * POST /api/codeforces/save-submission
 * 
 * Saves a Codeforces submission and its verdict to the database.
 * Called from the client after polling detects a final verdict.
 * 
 * This is the AUTHORITY for leaderboard & achievements:
 * - Saves to submissions table (unified, source='codeforces')
 * - Updates user_progress (SOLVED/ATTEMPTED tracking)
 * - user_solve_stats auto-updated via trigger
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

        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > 128 * 1024) {
            return NextResponse.json({ error: 'Submission payload is too large' }, { status: 413 });
        }
        const body = await req.json();
        const {
            cfSubmissionId,
            contestId,
            problemIndex,
            sheetId,
            verdict,
            language,
            sourceCode,
            cfHandle,
            urlType,
            groupId,
            compilationError,
            details,
            testNumber,
        } = body;

        if (!cfSubmissionId || !contestId || !problemIndex || !verdict ||
            typeof verdict !== 'string' || typeof contestId !== 'string' ||
            typeof problemIndex !== 'string') {
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

        // This endpoint only accepts real Codeforces IDs. Judge0 submissions
        // are persisted by /api/judge/submit and must not be forged here.
        const submissionIdNum = parseInt(cfSubmissionId, 10);
        if (!Number.isSafeInteger(submissionIdNum) || submissionIdNum <= 0 || String(submissionIdNum) !== String(cfSubmissionId)) {
            return NextResponse.json({ error: 'Invalid cfSubmissionId' }, { status: 400 });
        }

        const userResult = await query(
            'SELECT codeforces_handle FROM users WHERE id = $1',
            [user.id]
        );
        const userHandle = String(userResult.rows[0]?.codeforces_handle || '').trim();
        if (!userHandle || !cfHandle || String(cfHandle).trim().toLowerCase() !== userHandle.toLowerCase()) {
            return NextResponse.json({ error: 'Link your Codeforces account before syncing submissions' }, { status: 403 });
        }

        const normalizedContestId = String(contestId).trim();
        const normalizedProblemIndex = String(problemIndex).trim().toUpperCase();
        if (!/^\d{1,10}$/.test(normalizedContestId) || !/^[A-Z][A-Z0-9]{0,9}$/.test(normalizedProblemIndex)) {
            return NextResponse.json({ error: 'Invalid contest or problem identifier' }, { status: 400 });
        }
        if (typeof sourceCode === 'string' && sourceCode.length > 64 * 1024) {
            return NextResponse.json({ error: 'Source code is too large' }, { status: 400 });
        }

        // Never trust verdict/timing fields supplied by the browser. Confirm
        // the exact ID is a submission by the linked handle for this problem.
        let verifiedSubmission: any = null;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            let cfRes: Response;
            try {
                cfRes = await fetch(
                    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(userHandle)}&from=1&count=10000`,
                    { signal: controller.signal, headers: { Accept: 'application/json' } },
                );
            } finally {
                clearTimeout(timeout);
            }
            if (!cfRes.ok) return NextResponse.json({ error: 'Codeforces verification is temporarily unavailable' }, { status: 502 });
            const cfData = await cfRes.json();
            if (cfData?.status !== 'OK' || !Array.isArray(cfData.result)) {
                return NextResponse.json({ error: 'Codeforces verification failed' }, { status: 502 });
            }
            verifiedSubmission = cfData.result.find((submission: any) => {
                const handles = submission.author?.members?.map((member: any) => String(member.handle || '').toLowerCase()) || [];
                return Number(submission.id) === submissionIdNum &&
                    String(submission.contestId || '') === normalizedContestId &&
                    String(submission.problem?.index || '').toUpperCase() === normalizedProblemIndex &&
                    handles.includes(userHandle.toLowerCase());
            });
        } catch {
            return NextResponse.json({ error: 'Codeforces verification is temporarily unavailable' }, { status: 502 });
        }
        if (!verifiedSubmission) {
            return NextResponse.json({ error: 'Submission could not be verified for this account' }, { status: 403 });
        }

        const verdictMap: Record<string, string> = {
            OK: 'Accepted', WRONG_ANSWER: 'Wrong Answer', TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
            MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded', RUNTIME_ERROR: 'Runtime Error',
            COMPILATION_ERROR: 'Compilation Error', PRESENTATION_ERROR: 'Presentation Error',
            IDLENESS_LIMIT_EXCEEDED: 'Idleness Limit Exceeded', CHALLENGED: 'Challenged', SKIPPED: 'Skipped',
        };
        const serverVerdict = verdictMap[String(verifiedSubmission.verdict || '').toUpperCase()] || 'Unknown';
        const requestedVerdict = String(verdict).trim().toLowerCase();
        if (requestedVerdict !== serverVerdict.toLowerCase() && !(requestedVerdict === 'ok' && serverVerdict === 'Accepted')) {
            return NextResponse.json({ error: 'Submission verdict does not match Codeforces' }, { status: 409 });
        }
        const finalCfHandle = userHandle;

        // 1. Save to unified submissions table (upsert on cf_submission_id to prevent duplicates)
        const insertResult = await query(
            `INSERT INTO submissions (
                user_id, source, cf_submission_id, contest_id, problem_index, sheet_id,
                verdict, time_ms, memory_kb, language, source_code,
                cf_handle, url_type, group_id, compilation_error, details, test_number
            ) VALUES ($1, 'codeforces', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (cf_submission_id) DO UPDATE SET
                verdict = EXCLUDED.verdict,
                time_ms = EXCLUDED.time_ms,
                memory_kb = EXCLUDED.memory_kb,
                compilation_error = EXCLUDED.compilation_error,
                details = EXCLUDED.details,
                test_number = EXCLUDED.test_number
            WHERE submissions.user_id = EXCLUDED.user_id
            RETURNING id`,
            [
                user.id,
                cfSubmissionId,
                contestId,
                normalizedProblemIndex,
                sheetId || null,
                serverVerdict,
                Number(verifiedSubmission.timeConsumedMillis) || 0,
                Math.round((Number(verifiedSubmission.memoryConsumedBytes) || 0) / 1024),
                verifiedSubmission.programmingLanguage || language || null,
                sourceCode || null,
                finalCfHandle || null,
                urlType || 'contest',
                groupId || null,
                compilationError || null,
                details || null,
                testNumber || null,
            ]
        );

        const savedId = insertResult.rows[0]?.id;
        if (!savedId) {
            return NextResponse.json({ error: 'Submission belongs to another account' }, { status: 403 });
        }

        // 2. Update user_progress (the source of truth for "did user solve this?")
        //    trackingProblemId format: "contestId:problemIndex" — matches roadmap & sync scripts
        const trackingProblemId = `${normalizedContestId}:${normalizedProblemIndex}`;
        const isAc = serverVerdict === 'Accepted';
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
            savedId,
            status === 'SOLVED' ? new Date() : null
        ]);

        if (status === 'SOLVED') {
            // Update streak and invalidate caches in parallel
            const { updateStreakOnSolve } = await import('@/lib/services/streaks');
            
            await Promise.all([
                updateStreakOnSolve(user.id),
                invalidateCache(`user:${user.id}:dashboard_stats`),
                invalidateCache(`user:${user.id}:roadmap`),
                invalidateCache(`user:${user.id}:streak`),
                invalidateCache(`user:${user.id}:achievements`),
                invalidateCache(`user:${user.id}:curriculum_progress`),
                invalidateCache('leaderboard:sheets:public'),
            ]);

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
                    
                    // Parallelize sheet cache invalidation + achievement check
                    const cachePromise = Promise.all([
                        invalidateCache(`user:${user.id}:sheets:${level_slug}`),
                        invalidateCache(`user:${user.id}:details:${level_slug}:${sheet_slug}`),
                    ]);

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
                                const { updateUserStatus } = await import('@/lib/services/achievements');
                                await updateUserStatus(user.id, 'sheet_1_solved', true);
                            }
                        }
                    } catch (e) {
                        console.error('Achievement check failed:', e);
                    }

                    await cachePromise; // Ensure cache invalidation completes
                }
            }
        }


        // Only sync rank achievement on accepted submissions (expensive operation)
        if (isAc) {
            const { syncRank1Achievement } = await import('@/lib/services/achievements');
            await syncRank1Achievement('submission');
        }

        return NextResponse.json({
            success: true,
            id: savedId,
            status,
            trackingProblemId
        });

    } catch (error: any) {
        console.error('[API Save Submission] Database error:', error.message);
        
        // Handle unique constraint violation gracefully (duplicate submission)
        if (error.message?.includes('submissions_cf_submission_id_key') || error.message?.includes('duplicate key')) {
            return NextResponse.json({ success: true, duplicate: true });
        }

        // DB failure — tell the client so it can retry
        console.error('[API Save Submission] Database error:', error.message);
        return NextResponse.json({ 
            success: false, 
            error: 'DATABASE_UNAVAILABLE',
            message: 'Failed to save submission to database'
        }, { status: 503 });
    }
}
