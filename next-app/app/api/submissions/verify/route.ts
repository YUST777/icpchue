import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate-limit per user to prevent abuse of Codeforces public API and db writes
        const limitResult = await rateLimit(`cf-verify:${user.id}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many verification attempts. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        const { contestId, problemIndex, cfHandle, sourceCode, language, sheetId, urlType, groupId } = body;

        if (!contestId || !problemIndex || !cfHandle) {
            return NextResponse.json({ error: 'Missing required fields: contestId, problemIndex, cfHandle' }, { status: 400 });
        }

        const trimmedHandle = cfHandle.trim();
        if (trimmedHandle.length === 0) {
            return NextResponse.json({ error: 'Handle cannot be empty' }, { status: 400 });
        }

        // 1. Fetch user status from Codeforces public API
        const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(trimmedHandle)}&from=1&count=20`;
        
        let cfRes;
        try {
            cfRes = await fetch(cfUrl);
        } catch (fetchErr: any) {
            return NextResponse.json({ error: `Unable to reach Codeforces API. Please try again later. Details: ${fetchErr.message}` }, { status: 502 });
        }

        if (!cfRes.ok) {
            return NextResponse.json({ error: `Failed to fetch from Codeforces (Status ${cfRes.status}). Please make sure your Codeforces handle "${trimmedHandle}" is correct and public!` }, { status: 400 });
        }

        const cfData = await cfRes.json();
        if (cfData.status !== 'OK' || !Array.isArray(cfData.result)) {
            return NextResponse.json({ error: cfData.comment || 'Failed to fetch status from Codeforces.' }, { status: 400 });
        }

        // 2. Find matching Accepted submission
        const targetContestId = Number(contestId);
        const match = cfData.result.find((sub: any) => {
            const isContestMatch = Number(sub.contestId) === targetContestId;
            const isProblemMatch = sub.problem?.index?.toUpperCase() === problemIndex.toUpperCase();
            const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
            return isContestMatch && isProblemMatch && isAccepted;
        });

        if (!match) {
            return NextResponse.json({
                success: false,
                error: `No Accepted (AC) submission found on Codeforces for handle "${trimmedHandle}" and problem ${contestId}${problemIndex}. Please make sure you have submitted the code, it has passed all test cases, and your handle matches.`
            });
        }

        // 3. Save Codeforces handle to user profile in DB
        await query(
            'UPDATE users SET codeforces_handle = $1 WHERE id = $2',
            [trimmedHandle, user.id]
        );

        // 4. Save to submissions (unified table, source='codeforces')
        const timeMs = match.timeConsumedMillis || 0;
        const memoryKb = Math.round((match.memoryConsumedBytes || 0) / 1024);

        const insertResult = await query(
            `INSERT INTO submissions (
                user_id, source, cf_submission_id, contest_id, problem_index, sheet_id,
                verdict, time_ms, memory_kb, language, source_code,
                cf_handle, url_type, group_id, test_number
            ) VALUES ($1, 'codeforces', $2, $3, $4, $5, 'Accepted', $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (cf_submission_id) DO UPDATE SET
                verdict = EXCLUDED.verdict,
                time_ms = EXCLUDED.time_ms,
                memory_kb = EXCLUDED.memory_kb,
                source_code = EXCLUDED.source_code,
                language = EXCLUDED.language
            RETURNING id`,
            [
                user.id,
                match.id,
                contestId,
                problemIndex.toUpperCase(),
                sheetId || null,
                timeMs,
                memoryKb,
                language || 'C++',
                sourceCode || null,
                trimmedHandle,
                urlType || 'contest',
                groupId || null,
                match.passedTestCount || null
            ]
        );

        const savedId = insertResult.rows[0]?.id;

        // 5. Update user_progress
        const trackingProblemId = `${contestId}:${problemIndex.toUpperCase()}`;
        await query(`
            INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
            VALUES ($1, $2, $3, 'SOLVED', $4, $5)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET 
                status = 'SOLVED',
                submission_id = EXCLUDED.submission_id,
                solved_at = EXCLUDED.solved_at
        `, [
            user.id,
            trackingProblemId,
            sheetId || null,
            match.id,
            new Date()
        ]);

        // 6. Invalidate caches & update achievements/streaks
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
                
                const cachePromise = Promise.all([
                    invalidateCache(`user:${user.id}:sheets:${level_slug}`),
                    invalidateCache(`user:${user.id}:details:${level_slug}:${sheet_slug}`),
                ]);

                // Achievement logic: Sheet 1 completion
                try {
                    const progressCheck = await query(`
                        SELECT 
                            (SELECT total_problems FROM curriculum_sheets WHERE id = $1) as total,
                            (SELECT COUNT(*) FROM user_progress WHERE user_id = $2 AND sheet_id = $1::text AND status = 'SOLVED') as solved
                    `, [sheet_id_raw, user.id]);

                    const { total, solved } = progressCheck.rows[0];
                    if (total > 0 && solved >= total) {
                        if ((level_number === 0 || level_number === 1) && sheet_number === 1) {
                            const { updateUserStatus } = await import('@/lib/services/achievements');
                            await updateUserStatus(user.id, 'sheet_1_solved', true);
                        }
                    }
                } catch (e) {
                    console.error('Achievement check failed:', e);
                }

                await cachePromise;
            }
        }

        // Sync rank achievement on accepted submissions
        const { syncRank1Achievement } = await import('@/lib/services/achievements');
        await syncRank1Achievement('submission');

        return NextResponse.json({
            success: true,
            submissionId: match.id,
            timeMs,
            memoryKb
        });

    } catch (err: any) {
        console.error('[Verify Route Error]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
