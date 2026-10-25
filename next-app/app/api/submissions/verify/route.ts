import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { sameCfHandle } from '@/lib/codeforces';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';
import { fetchContestSubmissions } from '@/lib/services/codeforces';

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

        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > 128 * 1024) {
            return NextResponse.json({ error: 'Verification payload is too large' }, { status: 413 });
        }
        const body = await req.json();
        const { 
            contestId, problemIndex, cfHandle, sourceCode, language, sheetId, urlType, groupId,
            isExtensionVerified, submissionId, timeMs, memoryKb, sourceError
        } = body;

        if (!contestId || !problemIndex || !cfHandle) {
            return NextResponse.json({ error: 'Missing required fields: contestId, problemIndex, cfHandle' }, { status: 400 });
        }

        let trimmedHandle = String(cfHandle).trim();
        if (!/^[A-Za-z0-9_.-]{1,24}$/.test(trimmedHandle)) {
            return NextResponse.json({ error: 'Handle cannot be empty' }, { status: 400 });
        }

        const targetContestId = Number(contestId);
        const normalizedProblemIndex = String(problemIndex).trim().toUpperCase();
        if (!Number.isSafeInteger(targetContestId) || targetContestId <= 0 ||
            !/^[A-Z][A-Z0-9]{0,9}$/.test(normalizedProblemIndex)) {
            return NextResponse.json({ error: 'Invalid contest or problem identifier' }, { status: 400 });
        }
        if (sourceCode !== undefined && sourceCode !== null &&
            (typeof sourceCode !== 'string' || sourceCode.length > 64 * 1024)) {
            return NextResponse.json({ error: 'Source code is too large' }, { status: 400 });
        }
        // The extension could not read the submitted code: log why, so a
        // Code Inspector gap is never a mystery again.
        if (!sourceCode && typeof sourceError === 'string') {
            console.warn(`[Verify] No source for ${targetContestId}${normalizedProblemIndex} (user ${user.id}): ${sourceError.slice(0, 300)}`);
        }
        // The v1.3 extension reads private/group submissions in the user's
        // own browser and sends only the matched row back to this route (no
        // Codeforces cookies leave the browser). Validate the handoff before
        // using it: only an already-linked handle may use this path, the
        // submission id and measurements must be finite positive integers,
        // and it is limited to private contest types that the public API
        // cannot verify. This preserves the privacy model while preventing
        // an unlinked user from claiming another account's submission.
        const extensionSubmissionId = Number(submissionId);
        const extensionTimeMs = Number(timeMs);
        const extensionMemoryKb = Number(memoryKb);
        const extensionHandoff = isExtensionVerified === true &&
            (urlType === 'group' || urlType === 'gym') &&
            Number.isSafeInteger(extensionSubmissionId) && extensionSubmissionId > 0 &&
            Number.isFinite(extensionTimeMs) && extensionTimeMs >= 0 && extensionTimeMs <= 2147483647 &&
            Number.isFinite(extensionMemoryKb) && extensionMemoryKb >= 0 && extensionMemoryKb <= 2147483647;

        // A public Codeforces profile is not proof that the caller owns that
        // handle. Once linked, the account handle is therefore immutable from
        // this endpoint. A first-time link is allowed only when the bridge
        // proves ownership from the user's live Codeforces session below.
        const ownerResult = await query('SELECT codeforces_handle FROM users WHERE id = $1', [user.id]);
        let linkedHandle = String(ownerResult.rows[0]?.codeforces_handle || '').trim();
        if (linkedHandle && !sameCfHandle(linkedHandle, trimmedHandle)) {
            return NextResponse.json({ error: 'CF handle mismatch' }, { status: 403 });
        }
        if (linkedHandle) trimmedHandle = linkedHandle;
        // The extension's submission id is self-reported, so it is accepted
        // only for problems the curriculum itself places in a private group or
        // gym (which the public API cannot see) — not because the client says
        // urlType is group/gym.
        if (extensionHandoff) {
            const { loadCurriculumIndex, isPrivateCurriculumProblem } = await import('@/lib/services/codeforces-backfill');
            const curriculum = await loadCurriculumIndex();
            if (!isPrivateCurriculumProblem(curriculum, String(targetContestId), normalizedProblemIndex, groupId || null)) {
                return NextResponse.json({
                    success: false,
                    error: 'This problem can be verified with the public Codeforces API. Please try again.',
                    code: 'NOT_PRIVATE_PROBLEM'
                }, { status: 400 });
            }
        }
        // First sync through the extension links the handle automatically: the
        // extension read it from the student's own logged-in Codeforces session.
        // A handle can belong to only one account (checked in the same statement),
        // so nobody can claim a handle another student already uses, and once
        // linked it stays fixed (mismatch check above).
        if (extensionHandoff && !linkedHandle) {
            const linked = await query(
                `UPDATE users SET codeforces_handle = $1
                  WHERE id = $2 AND COALESCE(codeforces_handle, '') = ''
                    AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> $2 AND LOWER(o.codeforces_handle) = LOWER($1))
                  RETURNING id`,
                [trimmedHandle, user.id]
            );
            if (!linked.rows[0]) {
                console.warn('[Verify Route] Auto-link refused, handle already linked elsewhere:', trimmedHandle, 'user', user.id);
                return NextResponse.json({
                    success: false,
                    error: `The Codeforces account "${trimmedHandle}" is already linked to another icpchue.com account. Log in to Codeforces with your own account, or contact the ICPC HUE team.`,
                    code: 'CF_HANDLE_TAKEN'
                }, { status: 409 });
            }
            linkedHandle = trimmedHandle;
        }
        let match = null;

        // The extension has already checked the user's authenticated
        // Codeforces session. Use its matched row for group/gym contests,
        // where user.status/contest.status cannot reliably see private data.
        // Never allow this client handoff for public contests: those continue
        // through the server-side Codeforces API below.
        if (!match && extensionHandoff && linkedHandle) {
            match = {
                id: extensionSubmissionId,
                contestId: targetContestId,
                timeConsumedMillis: Math.round(extensionTimeMs),
                memoryConsumedBytes: Math.round(extensionMemoryKb) * 1024,
                passedTestCount: 15,
                programmingLanguage: typeof language === 'string' && language.length <= 100 ? language : 'C++'
            };
        }
        
        // 2. Standard server-side Codeforces API lookup. This is safe only for
        // a handle already linked to the caller; a public handle lookup alone
        // must never let a caller claim another person's solves.
        if (!match && linkedHandle) {
            const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(trimmedHandle)}&from=1&count=40`;
            
            let cfRes;
            try {
                cfRes = await fetch(cfUrl);
            } catch (fetchErr: any) {
                console.error('[Verify Route] Codeforces API unreachable:', fetchErr instanceof Error ? fetchErr.message : fetchErr);
                return NextResponse.json({ error: 'Unable to reach Codeforces API. Please try again later.' }, { status: 502 });
            }

            if (cfRes.ok) {
                const cfData = await cfRes.json();
                if (cfData.status === 'OK' && Array.isArray(cfData.result)) {
                    const rawMatch = cfData.result.find((sub: any) => {
                        const isContestMatch = Number(sub.contestId) === targetContestId;
                        const isProblemMatch = sub.problem?.index?.toUpperCase() === normalizedProblemIndex;
                        const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
                        return isContestMatch && isProblemMatch && isAccepted;
                    });
                    
                    if (rawMatch) {
                        match = {
                            id: Number(rawMatch.id),
                            contestId: targetContestId,
                            timeConsumedMillis: Number(rawMatch.timeConsumedMillis) || 0,
                            memoryConsumedBytes: Number(rawMatch.memoryConsumedBytes) || 0,
                            passedTestCount: Number(rawMatch.passedTestCount) || 15,
                            programmingLanguage: rawMatch.programmingLanguage || language || 'C++'
                        };
                    }
                }
            }
        }

        // 3. Fallback for Gym / Group submissions using the server's
        // authenticated API. It is still restricted to an already-linked
        // handle because the API key authenticates the application, not the
        // student making this request.
        if (!match && linkedHandle) {
            console.log(`[Verify Route] Attempting authenticated contest.status fallback for Gym/Group check. Contest: ${targetContestId}, problem: ${normalizedProblemIndex}`);
            try {
                const privateSubs = await fetchContestSubmissions(targetContestId, 500);
                if (privateSubs && privateSubs.length > 0) {
                    const privateMatch = privateSubs.find((sub: any) => {
                        const isProblemMatch = sub.problem?.index?.toUpperCase() === normalizedProblemIndex;
                        const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
                        const isUserMatch = 
                            sub.author?.members?.some((m: any) => m.handle?.toLowerCase() === trimmedHandle.toLowerCase()) ||
                            (sub.author?.handle && sub.author.handle.toLowerCase() === trimmedHandle.toLowerCase());
                        return isProblemMatch && isAccepted && isUserMatch;
                    });
                    if (privateMatch) {
                        console.log(`[Verify Route] Found matching Gym/Group submission in fallback: ${privateMatch.id}`);
                        match = {
                            id: privateMatch.id,
                            contestId: privateMatch.contestId,
                            timeConsumedMillis: privateMatch.timeConsumedMillis,
                            memoryConsumedBytes: privateMatch.memoryConsumedBytes,
                            passedTestCount: privateMatch.passedTestCount,
                            programmingLanguage: privateMatch.programmingLanguage
                        };
                    }
                }
            } catch (fallbackErr) {
                console.error('[Verify Route] Gym/Group fallback failed:', fallbackErr);
            }
        }

        if (!match) {
            // A private group or gym cannot be read through the public API, so an
            // empty result there means "could not check", not "no accepted solution".
            const isPrivate = (urlType === 'group' || urlType === 'gym');
            if (isPrivate) {
                return NextResponse.json({
                    success: false,
                    error: 'Private groups and gyms are checked by the extension. Open the problem on Codeforces and press Check & Sync.',
                    code: 'USE_EXTENSION_SYNC'
                }, { status: 422 });
            }

            if (!linkedHandle) {
                return NextResponse.json({
                    success: false,
                    error: 'Link your Codeforces account first, then verify the submission again.',
                    code: 'CF_HANDLE_NOT_LINKED'
                }, { status: 403 });
            }

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
        const calculatedTimeMs = match.timeConsumedMillis || 0;
        const calculatedMemoryKb = Math.round((match.memoryConsumedBytes || 0) / 1024);

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
                -- A browser sync may already have persisted the exact source
                -- from this Codeforces submission. Keep it instead of
                -- replacing it with the current editor buffer.
                source_code = COALESCE(submissions.source_code, EXCLUDED.source_code),
                language = EXCLUDED.language
            WHERE submissions.user_id = EXCLUDED.user_id
            RETURNING id`,
            [
                user.id,
                match.id,
                contestId,
                normalizedProblemIndex,
                sheetId || null,
                calculatedTimeMs,
                calculatedMemoryKb,
                language || 'C++',
                sourceCode || null,
                trimmedHandle,
                urlType || 'contest',
                groupId || null,
                match.passedTestCount || null
            ]
        );

        const savedId = insertResult.rows[0]?.id;
        if (!savedId) {
            return NextResponse.json({ error: 'Submission belongs to another account' }, { status: 403 });
        }

        // 5. Update user_progress. Re-verifying an already solved problem
        // must not move solved_at or count as a new daily solve/streak day.
        const trackingProblemId = `${targetContestId}:${normalizedProblemIndex}`;
        const priorProgress = await query(
            'SELECT status FROM user_progress WHERE user_id = $1 AND problem_id = $2 LIMIT 1',
            [user.id, trackingProblemId]
        );
        const wasSolved = priorProgress.rows[0]?.status === 'SOLVED';
        await query(`
            INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
            VALUES ($1, $2, $3, 'SOLVED', $4, $5)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET 
                status = 'SOLVED',
                sheet_id = COALESCE(user_progress.sheet_id, EXCLUDED.sheet_id),
                submission_id = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.submission_id ELSE EXCLUDED.submission_id END,
                solved_at = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.solved_at ELSE EXCLUDED.solved_at END
        `, [
            user.id,
            trackingProblemId,
            sheetId || null,
            savedId,
            new Date()
        ]);

        // 6. Invalidate caches & update achievements/streaks
        const { updateStreakOnSolve } = await import('@/lib/services/streaks');
        
        await Promise.all([
            wasSolved ? Promise.resolve() : updateStreakOnSolve(user.id),
            invalidateCache(`user:${user.id}:solved:${contestId}`),
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
                        const { grantSheetBadge } = await import('@/lib/services/achievements');
                        await grantSheetBadge(user.id, level_number, sheet_number);
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
            timeMs: calculatedTimeMs,
            memoryKb: calculatedMemoryKb
        });

    } catch (err: any) {
        console.error('[Verify Route Error]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
