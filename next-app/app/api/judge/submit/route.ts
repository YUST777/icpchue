import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { Judge0Token, Judge0SubmissionResult } from '@/lib/types';
import { invalidateCache } from '@/lib/cache';

// Self-hosted Judge0 Configuration
const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;

// C++ Language ID in Judge0
const CPP_LANGUAGE_ID = 54; // C++ (GCC 9.2.0)
const CPP_COMPILER_OPTIONS = '-std=c++17 -O2'; // Match Codeforces C++17 settings

interface SubmitRequest {
    sheetId: string;
    problemId: string;
    sourceCode: string;
    tabSwitches?: number;
    pasteEvents?: number;
    timeToSolve?: number;
}

// Helper Comparison Function (Codeforces Style)
function compareOutputs(expected: string, actual: string): boolean {
    if (!expected && !actual) return true;
    if (!expected || !actual) return false;

    // Normalize: split by whitespace to handle different spacing/newlines
    const tokensExp = expected.trim().split(/\s+/);
    const tokensAct = actual.trim().split(/\s+/);

    if (tokensExp.length !== tokensAct.length) return false;

    for (let i = 0; i < tokensExp.length; i++) {
        const tExp = tokensExp[i];
        const tAct = tokensAct[i];

        // 1. Direct string match (Case-Insensitive)
        if (tExp.toLowerCase() === tAct.toLowerCase()) continue;

        // 2. BigInt comparison (Found logical error: precision loss for > 2^53)
        try {
            const biExp = BigInt(tExp);
            const biAct = BigInt(tAct);
            if (biExp === biAct) continue;
            return false;
        } catch {
            // Not valid integers
        }

        // 3. Numeric comparison with Epsilon
        const fExp = parseFloat(tExp);
        const fAct = parseFloat(tAct);

        if (!isNaN(fExp) && !isNaN(fAct)) {
            const diff = Math.abs(fExp - fAct);
            if (diff < 1e-5) continue;
        }

        return false;
    }
    return true;
}

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sheetId, problemId, sourceCode, tabSwitches = 0, pasteEvents = 0, timeToSolve }: SubmitRequest = await req.json();

        // Validate input
        if (!sheetId || !problemId || !sourceCode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Source code size limit (64KB) to prevent payload DoS
        if (sourceCode.length > 64 * 1024) {
            return NextResponse.json({ error: 'Source code is too large. Maximum 64KB allowed.' }, { status: 400 });
        }

        if (!JUDGE0_API_URL) {
            return NextResponse.json({ error: 'Judge service not configured' }, { status: 503 });
        }

        // Get problem data from curriculum system (including contest_id for progress tracking)
        // problemId here is the problem_letter (e.g., 'A'), sheetId is the DB sheet ID
        const problemResult = await query(`
            SELECT p.id, p.title, p.content, s.contest_id, s.slug AS sheet_slug, l.slug AS level_slug
            FROM curriculum_problems p
            JOIN curriculum_sheets s ON s.id = p.sheet_id
            JOIN curriculum_levels l ON l.id = s.level_id
            WHERE p.sheet_id = $1 AND p.problem_letter = $2
        `, [sheetId, problemId]);

        if (problemResult.rows.length === 0) {
            return NextResponse.json({ error: 'Problem not found in curriculum' }, { status: 404 });
        }

        const problem = problemResult.rows[0];
        const content = problem.content || {};
        const testCases = content.testCases || [];
        const timeLimitMs = content.meta?.timeLimitMs || 2000;
        const memoryLimitMB = content.meta?.memoryLimitMB || 256;


        if (testCases.length === 0) {
            return NextResponse.json({ error: 'No test cases found for this problem' }, { status: 400 });
        }

        // Get IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const ipAddress = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

        // Combined pre-check: rate limit + duplicate + attempt count in ONE query
        const normalizedCode = sourceCode.trim();
        const preCheck = await query(`
            SELECT
                (SELECT submitted_at FROM training_submissions 
                 WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1
                ) AS last_submitted_at,
                (SELECT id FROM training_submissions 
                 WHERE user_id = $1 AND sheet_id = $2 AND problem_id = $3 
                   AND MD5(TRIM(source_code)) = MD5($4) LIMIT 1
                ) AS duplicate_id,
                (SELECT COUNT(*) FROM training_submissions 
                 WHERE user_id = $1 AND sheet_id = $2 AND problem_id = $3
                ) AS attempt_count
        `, [user.id, sheetId, problemId, normalizedCode]);

        const { last_submitted_at, duplicate_id, attempt_count } = preCheck.rows[0];

        // Rate Limiting (3 seconds)
        if (last_submitted_at) {
            const lastTime = new Date(last_submitted_at).getTime();
            const now = Date.now();
            if (now - lastTime < 3000) {
                const waitSeconds = Math.ceil((3000 - (now - lastTime)) / 1000);
                return NextResponse.json(
                    { error: `Please wait ${waitSeconds}s before submitting again` },
                    { status: 429 }
                );
            }
        }

        // Duplicate Check
        if (duplicate_id) {
            return NextResponse.json(
                { error: 'You have already submitted this exact code for this problem' },
                { status: 400 }
            );
        }

        const attemptNumber = (parseInt(attempt_count) || 0) + 1;

        // ============================================
        // BATCH SUBMISSION TO JUDGE0
        // ============================================

        const batchPayload = {
            submissions: testCases.map((tc: any) => ({
                source_code: Buffer.from(sourceCode).toString('base64'),
                language_id: CPP_LANGUAGE_ID,
                stdin: Buffer.from(tc.input).toString('base64'),
                expected_output: Buffer.from(tc.output).toString('base64'),
                cpu_time_limit: timeLimitMs / 1000,
                memory_limit: memoryLimitMB * 1024,
                compiler_options: CPP_COMPILER_OPTIONS,
            }))
        };

        const batchResponse = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(JUDGE0_AUTH_TOKEN && { 'X-Judge0-Token': JUDGE0_AUTH_TOKEN })
            },
            body: JSON.stringify(batchPayload),
        });

        if (!batchResponse.ok) {
            const errorText = await batchResponse.text();
            return NextResponse.json({ error: 'Judge service temporarily unavailable' }, { status: 503 });
        }

        const batchTokens = await batchResponse.json();
        const validTokens = batchTokens.filter((t: Judge0Token) => t.token);
        if (validTokens.length === 0) {
            return NextResponse.json({ error: 'Failed to submit code for judging' }, { status: 500 });
        }

        // Poll for results
        const tokenString = validTokens.map((t: Judge0Token) => t.token).join(',');
        let submissions: Judge0SubmissionResult[] = [];
        let pollAttempts = 0;
        const maxPollAttempts = 30;

        while (pollAttempts < maxPollAttempts) {
            await new Promise(r => setTimeout(r, 1000));
            pollAttempts++;

            const resultsResponse = await fetch(
                `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=token,stdout,stderr,status_id,time,memory,compile_output`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(JUDGE0_AUTH_TOKEN && { 'X-Judge0-Token': JUDGE0_AUTH_TOKEN })
                    }
                }
            );

            if (!resultsResponse.ok) continue;

            const pollData = await resultsResponse.json();
            submissions = pollData.submissions || [];

            if (submissions.every((s: Judge0SubmissionResult) => s.status_id >= 3)) break;
        }

        // Process results
        const results = [];
        let allPassed = true;
        let totalTimeMs = 0;
        let maxMemoryKb = 0;

        for (let i = 0; i < submissions.length; i++) {
            const result = submissions[i];
            const testCase = testCases[i];

            const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : '';
            const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
            const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '';

            if (result.time) totalTimeMs += parseFloat(result.time) * 1000;
            if (result.memory && result.memory > maxMemoryKb) maxMemoryKb = result.memory;

            let verdict: string;
            let passed = false;

            switch (result.status_id) {
                case 3: // Accepted
                    if (compareOutputs(testCase.output, stdout)) {
                        verdict = 'Accepted';
                        passed = true;
                    } else {
                        verdict = 'Wrong Answer';
                        allPassed = false;
                    }
                    break;
                case 4: verdict = 'Wrong Answer'; allPassed = false; break;
                case 5: verdict = 'Time Limit Exceeded'; allPassed = false; break;
                case 6: verdict = 'Compilation Error'; allPassed = false; break;
                case 7: case 8: case 9: case 10: case 11: case 12: verdict = 'Runtime Error'; allPassed = false; break;
                case 13: verdict = 'Internal Error'; allPassed = false; break;
                default: verdict = 'Unknown'; allPassed = false;
            }

            results.push({
                testCase: i + 1,
                verdict,
                passed,
                time: result.time ? `${result.time}s` : null,
                memory: result.memory ? `${Math.round(result.memory / 1024)}MB` : null,
                output: stdout,
                ...(verdict === 'Compilation Error' && { compileError: compileOutput }),
                ...(verdict === 'Runtime Error' && { runtimeError: stderr }),
            });
        }

        const finalVerdict = allPassed ? 'Accepted' : results.find(r => !r.passed)?.verdict || 'Unknown';
        const passedCount = results.filter(r => r.passed).length;
        const compileError = results.find(r => r.compileError)?.compileError || null;
        const runtimeError = results.find(r => r.runtimeError)?.runtimeError || null;

        // Save submission history
        const insertResult = await query(
            `INSERT INTO training_submissions (
                user_id, sheet_id, problem_id, source_code, verdict,
                time_ms, memory_kb, test_cases_passed, total_test_cases,
                compile_error, runtime_error, ip_address,
                tab_switches, paste_events, time_to_solve_seconds, attempt_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [user.id, sheetId, problemId, sourceCode, finalVerdict, Math.round(totalTimeMs), maxMemoryKb, passedCount, testCases.length, compileError, runtimeError, ipAddress, tabSwitches, pasteEvents, timeToSolve || null, attemptNumber]
        );

        const submissionId = insertResult.rows[0]?.id;

        // Update user progress tracking
        // Use contestId:letter format to match progress queries (e.g., "219158:C")
        const contestIdForProgress = problem.contest_id;
        const trackingProblemId = contestIdForProgress
            ? `${contestIdForProgress}:${problemId}`
            : `${sheetId}:${problemId}`;
        const status = allPassed ? 'SOLVED' : 'ATTEMPTED'; // Use actual verdict for progress tracking

        await query(`
            INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, problem_id) 
            DO UPDATE SET 
                status = CASE WHEN user_progress.status = 'SOLVED' THEN 'SOLVED' ELSE EXCLUDED.status END,
                submission_id = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.submission_id ELSE EXCLUDED.submission_id END,
                solved_at = CASE WHEN EXCLUDED.status = 'SOLVED' AND user_progress.status != 'SOLVED' THEN EXCLUDED.solved_at ELSE user_progress.solved_at END
        `, [user.id, trackingProblemId, sheetId, status, submissionId, status === 'SOLVED' ? new Date() : null]);

        if (status === 'SOLVED') {
            await invalidateCache(`user:${user.id}:dashboard_stats`);
            await invalidateCache(`user:${user.id}:roadmap`);
            await invalidateCache(`user:${user.id}:achievements`);
            await invalidateCache(`user:${user.id}:curriculum_progress`);
            await invalidateCache('leaderboard:sheets:public');
            if (problem.level_slug) {
                await invalidateCache(`user:${user.id}:sheets:${problem.level_slug}`);
                if (problem.sheet_slug) {
                    await invalidateCache(`user:${user.id}:details:${problem.level_slug}:${problem.sheet_slug}`);
                }
            }

            // --- Achievement Logic: Sheet 1 Completion ---
            try {
                const progressCheck = await query(`
                    SELECT 
                        (SELECT total_problems FROM curriculum_sheets WHERE id = $1) as total,
                        (SELECT COUNT(*) FROM user_progress WHERE user_id = $2 AND sheet_id = $1::text AND status = 'SOLVED') as solved
                `, [sheetId, user.id]);

                const { total, solved } = progressCheck.rows[0];
                if (total > 0 && solved >= total) {
                    const sheetInfo = await query('SELECT sheet_number, level_id FROM curriculum_sheets WHERE id = $1', [sheetId]);
                    if (sheetInfo.rows.length > 0) {
                        const sheet = sheetInfo.rows[0];
                        const levelInfo = await query('SELECT level_number FROM curriculum_levels WHERE id = $1', [sheet.level_id]);
                        if (levelInfo.rows.length > 0) {
                            const levelNum = levelInfo.rows[0].level_number;
                            // Sheet 1 Achievement is for Level 0 (Newcomers) or Level 1 first sheet
                            if ((levelNum === 0 || levelNum === 1) && sheet.sheet_number === 1) {
                                const { updateUserStatus } = await import('@/lib/achievements');
                                await updateUserStatus(user.id, 'sheet_1_solved', true);
                            }
                        }
                    }
                }
            } catch {
            }
        }

        const { syncRank1Achievement } = await import('@/lib/achievements');
        await syncRank1Achievement('submission');

        return NextResponse.json({
            success: true,
            submissionId,
            verdict: finalVerdict,
            passed: allPassed,
            testsPassed: passedCount,
            totalTests: testCases.length,
            time: `${Math.round(totalTimeMs)}ms`,
            memory: `${Math.round(maxMemoryKb)}KB`,
            attemptNumber,
            results,
            problem: {
                id: problemId,
                title: problem.title,
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
