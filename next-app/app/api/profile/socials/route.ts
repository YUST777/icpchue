import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { invalidateCache } from '@/lib/cache/cache';
import { cleanSocials } from '@/lib/profile/socials';

// PUT: replace the signed-in user's social handles.
export async function PUT(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`socials:${user.id}`, 10, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    try {
        const body = await req.json().catch(() => null);
        const socials = cleanSocials(body?.socials);
        await query('UPDATE users SET social_links = $1::jsonb WHERE id = $2', [JSON.stringify(socials), user.id]);

        const studentId = user.email.split('@')[0];
        if (studentId) await invalidateCache(`public-profile:v3:${studentId}`);

        return NextResponse.json({ socials });
    } catch (error) {
        console.error('[profile/socials] save failed:', error);
        return NextResponse.json({ error: 'Could not save your links' }, { status: 500 });
    }
}
