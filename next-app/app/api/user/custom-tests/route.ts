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
    } catch (error) {
        console.error('[custom-tests GET]', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
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

        await query(
            `INSERT INTO user_custom_tests (user_id, contest_id, problem_id, test_cases, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (user_id, contest_id, problem_id)
             DO UPDATE SET test_cases = EXCLUDED.test_cases, updated_at = NOW()`,
            [auth.id, contestId, problemId.toUpperCase(), JSON.stringify(testCases)]
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[custom-tests POST]', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
