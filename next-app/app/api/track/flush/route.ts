import { NextRequest, NextResponse } from 'next/server';
import { flushEvents } from '@/lib/track-buffer';

/**
 * Manual flush endpoint — can be called by cron or admin.
 * Protected by a simple secret header.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-flush-secret');
    if (secret !== (process.env.TRACK_FLUSH_SECRET || 'icpchue-flush-2026')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const flushed = await flushEvents();
        return NextResponse.json({ ok: true, flushed });
    } catch (err) {
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
