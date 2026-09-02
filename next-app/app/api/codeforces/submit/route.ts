import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';

// CF_BRIDGE_URL is the read-only history bridge; submissions still use the
// separate bridge that implements /submit.
const BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://scrapling-bridge:8787';

export async function POST(request: NextRequest) {
    try {
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > 384 * 1024) {
            return NextResponse.json({ success: false, error: 'Submission payload is too large' }, { status: 413 });
        }
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limitResult = await rateLimit(`cf-submit:${user.id}`, 5, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many submission requests. Please wait.' }, { status: 429 });
        }

        const body = await request.json();
        const { contestId, problemIndex, code, language, cookies, csrfToken, urlType, groupId } = body;

        if (!contestId || !problemIndex || !code || !language || !cookies) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        if (typeof contestId !== 'string' || !/^\d{1,10}$/.test(contestId) ||
            typeof problemIndex !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,9}$/.test(problemIndex) ||
            typeof language !== 'string' || language.length > 100 ||
            typeof cookies !== 'string' || cookies.length > 16 * 1024 || /[\r\n]/.test(cookies) ||
            (csrfToken !== undefined && csrfToken !== null && (typeof csrfToken !== 'string' || csrfToken.length > 4096))) {
            return NextResponse.json({ success: false, error: 'Invalid submission payload' }, { status: 400 });
        }
        const normalizedUrlType = urlType || 'contest';
        if (!['contest', 'group', 'gym'].includes(normalizedUrlType)) {
            return NextResponse.json({ success: false, error: 'Invalid contest type' }, { status: 400 });
        }
        if (groupId !== undefined && groupId !== null &&
            (typeof groupId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(groupId))) {
            return NextResponse.json({ success: false, error: 'Invalid group ID' }, { status: 400 });
        }

        // Reject oversized code (CF limit is 64KB, we allow 256KB for safety)
        if (typeof code !== 'string' || code.length > 256 * 1024) {
            return NextResponse.json({ success: false, error: 'Code too large (max 256KB)' }, { status: 400 });
        }

        // Start the submission job on the bridge (returns immediately with jobId)
        const bridgeRes = await fetch(`${BRIDGE_URL}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.CF_BRIDGE_SHARED_SECRET ? { Authorization: process.env.CF_BRIDGE_SHARED_SECRET } : {}),
            },
            body: JSON.stringify({
                contestId, problemIndex, code, language, cookies, csrfToken,
                urlType: normalizedUrlType,
                groupId: groupId || null,
            }),
        });

        const ct = bridgeRes.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
            const data = await bridgeRes.json();
            return NextResponse.json(data, { status: bridgeRes.ok ? 200 : 502 });
        }

        return NextResponse.json({ success: false, error: 'BRIDGE_ERROR' }, { status: 502 });
    } catch (error: any) {
        console.error('[CF Submit Proxy] Error:', error.message || error);
        return NextResponse.json(
            { success: false, error: 'Internal proxy error' },
            { status: 500 }
        );
    }
}
