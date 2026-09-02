import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`tests_get:${auth.id}`, 30, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');
    const problemId = searchParams.get('problemId');

    if (!contestId || !problemId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    try {
        const res = await query(
            `SELECT test_cases FROM user_custom_tests 
             WHERE user_id = $1 AND contest_id = $2 AND problem_id = $3`,
            [auth.id, contestId, problemId.toUpperCase()]
        );
        return NextResponse.json({ testCases: res.rows[0]?.test_cases || [] });
    } catch (error: any) {
        // Custom tests are non-critical (user-saved scratch test cases). If the
        // DB read fails, degrade gracefully to an empty list so the test runner
        // and editor still load, instead of surfacing a 500 to the client.
        console.error('[custom-tests GET]', error?.code || '', error?.message || error);
        return NextResponse.json({ testCases: [] });
    }
}

export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`tests_save:${auth.id}`, 30, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    try {
        const { contestId, problemId, testCases } = await request.json();
        if (!contestId || !problemId || !Array.isArray(testCases)) {
            return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
        }
        if (typeof contestId !== 'string' || contestId.length > 50 ||
            typeof problemId !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,9}$/.test(problemId) ||
            testCases.length > 100) {
            return NextResponse.json({ error: 'Invalid test case payload' }, { status: 400 });
        }
        const serialized = JSON.stringify(testCases);
        if (serialized.length > 256 * 1024 || testCases.some((testCase: unknown) =>
            !testCase || typeof testCase !== 'object' ||
            typeof (testCase as { input?: unknown }).input !== 'string' ||
            typeof (testCase as { output?: unknown }).output !== 'string' ||
            String((testCase as { input: string }).input).length > 32 * 1024 ||
            String((testCase as { output: string }).output).length > 32 * 1024)) {
            return NextResponse.json({ error: 'Test cases are too large or malformed' }, { status: 400 });
        }

        await query(
            `INSERT INTO user_custom_tests (user_id, contest_id, problem_id, test_cases, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, contest_id, problem_id)
             DO UPDATE SET test_cases = EXCLUDED.test_cases, updated_at = NOW()`,
            [auth.id, contestId, problemId.toUpperCase(), serialized]
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[custom-tests POST]', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
