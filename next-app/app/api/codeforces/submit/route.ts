import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://scrapling-bridge:8787';

export async function POST(request: NextRequest) {
    try {
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

        if (!contestId || !problemIndex || !code || !language || !cookies || !csrfToken) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Start the submission job on the bridge (returns immediately with jobId)
        const bridgeRes = await fetch(`${BRIDGE_URL}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contestId, problemIndex, code, language, cookies, csrfToken,
                urlType: urlType || 'contest',
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
            { success: false, error: 'Internal proxy error', details: error.message },
            { status: 500 }
        );
    }
}
