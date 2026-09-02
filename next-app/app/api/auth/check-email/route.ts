import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const rl = await rateLimit(`check-email:${ip}`, 10, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

        const body = await req.json();
        const { email } = body;

        if (typeof email !== 'string' || !email || email.length > 254) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Do not reveal whether an address belongs to an account or an
        // application. That distinction is an unauthenticated account and
        // student-ID enumeration oracle. Registration/login perform the real
        // check after email ownership has been established.
        return NextResponse.json({
            success: true,
            status: 'unknown',
            message: 'Email check completed.'
        });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
