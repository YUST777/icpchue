import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`get-ip:${user.id}`, 10, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    let clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
    }
    const cleanIP = clientIP.replace(/^::ffff:/, '');

    return NextResponse.json({ ip: cleanIP });
}
