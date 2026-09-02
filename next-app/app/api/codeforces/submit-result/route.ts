import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';

const BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://scrapling-bridge:8787';

export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jobId = request.nextUrl.searchParams.get('jobId');
        if (!jobId) {
            return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
        }
        // The value is interpolated into the bridge path. Restrict it to the
        // opaque identifier format returned by the bridge to prevent path
        // traversal or access to other bridge endpoints.
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) {
            return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
        }
        const rl = await rateLimit(`cf-submit-result:${user.id}`, 60, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

        const res = await fetch(`${BRIDGE_URL}/submit-result/${jobId}`, {
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            return NextResponse.json({ status: 'error', error: 'Job not found' }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[CF Submit Result] Error:', error.message || error);
        return NextResponse.json({ status: 'error', error: 'Internal error' }, { status: 500 });
    }
}
