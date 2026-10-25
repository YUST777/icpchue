import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { getPublicProfile } from '@/lib/profile/public-profile';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
) {
    const { studentId } = await params;

    // Student IDs are university identifiers, not arbitrary lookup strings.
    // Keeping this bounded also prevents attackers from filling the profile
    // cache with unbounded attacker-controlled keys.
    if (!/^\d{7,10}$/.test(studentId || '')) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    // Rate limit public profile access: 15 per 60s per IP
    const ratelimit = await rateLimit(`profile_view:${getClientIp(req)}`, 15, 60);
    if (!ratelimit.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const result = await getPublicProfile(studentId);
        if (result.status === 'not_found') return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        if (result.status === 'private') return NextResponse.json({ error: 'This profile is private' }, { status: 403 });
        return NextResponse.json({ success: true, profile: result.profile });
    } catch (error) {
        console.error('[Profile API Error]', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
