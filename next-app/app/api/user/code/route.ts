import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

/**
 * GET /api/user/code?contestId=X&problemId=Y
 * Returns all saved code for a user+problem (all languages).
 * Also returns the active language.
 */
export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`code_get:${auth.id}`, 60, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');
    const problemId = searchParams.get('problemId');

    if (!contestId || !problemId) {
        return NextResponse.json({ error: 'Missing contestId or problemId' }, { status: 400 });
    }

    try {
        // Get all working code for this problem (all languages)
        const codeRes = await query(
            `SELECT language, code, updated_at FROM user_code 
             WHERE user_id = $1 AND contest_id = $2 AND problem_id = $3 AND is_submitted = false`,
            [auth.id, contestId, problemId.toUpperCase()]
        );

        // Get active language preference
        const langRes = await query(
            `SELECT value FROM user_preferences 
             WHERE user_id = $1 AND key = $2`,
            [auth.id, `lang:${contestId}:${problemId.toUpperCase()}`]
        );

        const codeByLang: Record<string, { code: string; updatedAt: string }> = {};
        for (const row of codeRes.rows) {
            codeByLang[row.language] = { code: row.code, updatedAt: row.updated_at };
        }

        return NextResponse.json({
            codeByLang,
            activeLanguage: langRes.rows[0]?.value || null,
        });
    } catch (error) {
        console.error('[code GET]', error);
        return NextResponse.json({ error: 'Failed to fetch code' }, { status: 500 });
    }
}

/**
 * POST /api/user/code
 * Saves working code or a submission snapshot.
 * Body: { contestId, problemId, language, code, isSubmitted? }
 */
export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`code_save:${auth.id}`, 120, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    try {
        // sendBeacon sends text/plain, so we need to handle both content types
        const contentType = request.headers.get('content-type') || '';
        let body;
        if (contentType.includes('application/json')) {
            body = await request.json();
        } else {
            body = JSON.parse(await request.text());
        }
        const { contestId, problemId, language, code, isSubmitted, activeLanguage } = body;

        if (!contestId || !problemId || !language) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Limit code size to 512KB
        if (typeof code === 'string' && code.length > 512 * 1024) {
            return NextResponse.json({ error: 'Code too large (max 512KB)' }, { status: 400 });
        }

        const pid = (problemId as string).toUpperCase();

        if (isSubmitted) {
            // Submission snapshot — always INSERT a new row (history)
            await query(
                `INSERT INTO user_code (user_id, contest_id, problem_id, language, code, is_submitted, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
                [auth.id, contestId, pid, language, code || '']
            );
        } else {
            // Working code — UPSERT (one row per user+contest+problem+language)
            await query(
                `INSERT INTO user_code (user_id, contest_id, problem_id, language, code, is_submitted, updated_at)
                 VALUES ($1, $2, $3, $4, $5, false, NOW())
                 ON CONFLICT (user_id, contest_id, problem_id, language) WHERE is_submitted = false
                 DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()`,
                [auth.id, contestId, pid, language, code || '']
            );
        }

        // Save active language preference if provided
        if (activeLanguage) {
            await query(
                `INSERT INTO user_preferences (user_id, key, value, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [auth.id, `lang:${contestId}:${pid}`, activeLanguage]
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[code POST]', error);
        return NextResponse.json({ error: 'Failed to save code' }, { status: 500 });
    }
}
