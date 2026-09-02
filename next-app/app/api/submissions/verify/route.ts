import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
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
            cookies
        } = body;

        if (!contestId || !problemIndex || !cfHandle) {
            return NextResponse.json({ error: 'Missing required fields: contestId, problemIndex, cfHandle' }, { status: 400 });
        }

        const trimmedHandle = String(cfHandle).trim();
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
        if (cookies !== undefined && cookies !== null &&
            (typeof cookies !== 'string' || cookies.length > 16 * 1024)) {
            return NextResponse.json({ error: 'Invalid Codeforces session data' }, { status: 400 });
        }

        // A public Codeforces profile is not proof that the caller owns that
        // handle. Once linked, the account handle is therefore immutable from
        // this endpoint. A first-time link is allowed only when the bridge
        // proves ownership from the user's live Codeforces session below.
        const ownerResult = await query('SELECT codeforces_handle FROM users WHERE id = $1', [user.id]);
        const linkedHandle = String(ownerResult.rows[0]?.codeforces_handle || '').trim();
        if (linkedHandle && linkedHandle.toLowerCase() !== trimmedHandle.toLowerCase()) {
            return NextResponse.json({ error: 'CF handle mismatch' }, { status: 403 });
        }
        let match = null;
        // Track whether the CF Bridge (the only thing that can read PRIVATE
        // groups on serverless) was actually reachable + returned a usable
        // answer. Used to give an honest error instead of "No AC found" when
        // the bridge is mis-deployed.
        let bridgeReachable = false;
        let bridgeError: string | null = null;

        // 1. If cookies are provided by the Chrome extension, query the user's
        //    submissions via the CF Bridge. The bridge uses curl_cffi (Chrome TLS
        //    impersonation) + the user's own session cookies to read the PRIVATE
        //    group/contest status page — which a plain serverless fetch cannot do
        //    (Cloudflare managed-challenge) and which the official API cannot see.
        if (cookies) {
            console.log(`[Verify Route] Querying user submissions via CF Bridge (Contest: ${targetContestId}, Problem: ${problemIndex}, urlType: ${urlType})...`);

            const BRIDGE_URL = process.env.CF_BRIDGE_URL || process.env.SCRAPLING_BRIDGE_URL || 'http://cf-bridge:8787';
            const bridgeBody = JSON.stringify({
                contestId: String(targetContestId),
                problemIndex: normalizedProblemIndex,
                cookies,
                urlType: urlType || 'contest',
                groupId: groupId || null
            });

            let bridgeRes;
            try {
                const bridgeSecret = process.env.CF_BRIDGE_SHARED_SECRET;
                bridgeRes = await fetch(`${BRIDGE_URL}/submissions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(bridgeSecret ? { Authorization: bridgeSecret } : {}),
                    },
                    body: bridgeBody
                });
            } catch (err: any) {
                console.warn(`[Verify Route] Failed to connect to CF Bridge at ${BRIDGE_URL} (${err.message}). Trying local fallback (127.0.0.1:8787)...`);
                try {
                    bridgeRes = await fetch(`http://127.0.0.1:8787/submissions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(process.env.CF_BRIDGE_SHARED_SECRET ? { Authorization: process.env.CF_BRIDGE_SHARED_SECRET } : {}),
                        },
                        body: bridgeBody
                    });
                } catch (localErr: any) {
                    console.error('[Verify Route] Local CF Bridge fallback failed:', localErr.message);
                }
            }

            if (bridgeRes && bridgeRes.ok) {
                const bridgeData = await bridgeRes.json();
                if (bridgeData.success && Array.isArray(bridgeData.submissions)) {
                    bridgeReachable = true;
                    // Find the matched Accepted submission. The bridge already
                    // filters by problemIndex when provided, but we re-check
                    // problemIndex + handle defensively.
                    const rawMatch = bridgeData.submissions.find((sub: any) => {
                        const isAccepted = sub.verdict?.toUpperCase() === 'ACCEPTED' || sub.verdict === 'OK';
                        const isUserMatch = sub.author?.toLowerCase() === trimmedHandle.toLowerCase();
                        const isProblemMatch = !sub.problemIndex ||
                            sub.problemIndex.toUpperCase() === normalizedProblemIndex;
                        return isAccepted && isUserMatch && isProblemMatch;
                    });

                    if (rawMatch) {
                        console.log(`[Verify Route] Match found via CF Bridge! Submission: ${rawMatch.id}`);
                        match = {
                            id: Number(rawMatch.id),
                            contestId: targetContestId,
                            timeConsumedMillis: Number(rawMatch.timeConsumedMillis) || 0,
                            memoryConsumedBytes: Number(rawMatch.memoryConsumedBytes) || 0,
                            passedTestCount: 15,
                            programmingLanguage: rawMatch.language || language || 'C++'
                        };
                    }
                } else if (!bridgeData.success) {
                    bridgeError = bridgeData.error || 'BRIDGE_ERROR';
                    console.warn(`[Verify Route] CF Bridge returned error: ${bridgeData.error}`);
                }
            } else {
                bridgeError = 'BRIDGE_UNREACHABLE';
            }

            // Try contest.status as fallback
            if (!match && linkedHandle) {
                console.log(`[Verify Route] Match not found via Scrapling Bridge. Falling back to contest.status (Contest: ${targetContestId})...`);
                const cfUrl = `https://codeforces.com/api/contest.status?contestId=${targetContestId}&from=1&count=200`;
                try {
                    const cfRes = await fetch(cfUrl, {
                        headers: {
                            'Cookie': cookies,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (cfRes.ok) {
                        const cfData = await cfRes.json();
                        if (cfData.status === 'OK' && Array.isArray(cfData.result)) {
                            const rawMatch = cfData.result.find((sub: any) => {
                                const isProblemMatch = sub.problem?.index?.toUpperCase() === normalizedProblemIndex;
                                const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
                                const isUserMatch = 
                                    sub.author?.members?.some((m: any) => m.handle?.toLowerCase() === trimmedHandle.toLowerCase()) ||
                                    (sub.author?.handle && sub.author.handle.toLowerCase() === trimmedHandle.toLowerCase());
                                return isProblemMatch && isAccepted && isUserMatch;
                            });
                            
                            if (rawMatch) {
                                console.log(`[Verify Route] Match found on contest.status! Submission: ${rawMatch.id}`);
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
                } catch (err: any) {
                    console.error('[Verify Route] Cookie-auth contest.status fetch failed:', err);
                }
            }
            
            // Try user.status with cookies as fallback
            if (!match && linkedHandle) {
                const cfUserUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(trimmedHandle)}&from=1&count=100`;
                try {
                    const cfRes = await fetch(cfUserUrl, {
                        headers: {
                            'Cookie': cookies,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'application/json'
                        }
                    });
                    
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
                                console.log(`[Verify Route] Match found on user.status! Submission: ${rawMatch.id}`);
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
                } catch (err: any) {
                    console.error('[Verify Route] Cookie-auth user.status fetch failed:', err);
                }
            }
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
                return NextResponse.json({ error: `Unable to reach Codeforces API. Please try again later. Details: ${fetchErr.message}` }, { status: 502 });
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
            // Distinguish "bridge couldn't run" from "genuinely no AC". For a
            // PRIVATE group/gym, the public CF API cannot see submissions at all,
            // so a failed/unreachable bridge means we literally could not check —
            // don't mislead the user into thinking their AC doesn't exist.
            const isPrivate = (urlType === 'group' || urlType === 'gym');
            if (cookies && isPrivate && !bridgeReachable) {
                console.error(`[Verify Route] CF Bridge unavailable (${bridgeError || 'unknown'}) for private ${urlType}; cannot verify.`);
                return NextResponse.json({
                    success: false,
                    error: 'Could not reach the Codeforces verification service. This is a server configuration issue (CF_BRIDGE_URL), not your submission. Please try again shortly or contact an admin.',
                    code: bridgeError || 'BRIDGE_UNAVAILABLE'
                }, { status: 503 });
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
                source_code = EXCLUDED.source_code,
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

        // 5. Update user_progress
        const trackingProblemId = `${targetContestId}:${normalizedProblemIndex}`;
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
            savedId,
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
            timeMs: calculatedTimeMs,
            memoryKb: calculatedMemoryKb
        });

    } catch (err: any) {
        console.error('[Verify Route Error]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
