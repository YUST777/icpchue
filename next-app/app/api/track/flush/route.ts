import { NextRequest, NextResponse } from 'next/server';
import { flushEvents } from '@/lib/services/track-buffer';
import crypto from 'crypto';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';

/**
 * Manual flush endpoint — can be called by cron or admin.
 * Protected by a simple secret header.
 */
export async function POST(req: NextRequest) {
    const ip = getClientIp(req);
    const rl = await rateLimit(`track-flush:${ip}`, 3, 300);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const secret = req.headers.get('x-flush-secret');
    const expected = process.env.TRACK_FLUSH_SECRET;
    if (!expected || !secret || secret.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const flushed = await flushEvents();
        return NextResponse.json({ ok: true, flushed });
    } catch (err) {
        console.error('[Track Flush] Error:', err);
        return NextResponse.json({ ok: false, error: 'Flush failed' }, { status: 500 });
    }
}
