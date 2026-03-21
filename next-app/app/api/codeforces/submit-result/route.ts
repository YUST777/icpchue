import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

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
