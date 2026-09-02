import { NextRequest, NextResponse } from 'next/server';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { sanitizeInput } from '@/lib/security/validation';
import { rateLimit } from '@/lib/cache/rate-limit';
import { redis } from '@/lib/db/redis';
import { getClientIp } from '@/lib/security/request';

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const limitResult = await rateLimit(`check-app:${ip}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const { email } = await req.json();
        if (typeof email !== 'string' || !email || email.length > 254) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const normalizedEmail = sanitizeInput(email).toLowerCase();
        const emailBlindIndex = createBlindIndex(normalizedEmail);

        // Security: Only allow this check for emails that have been OTP-verified
        // This prevents unauthenticated enumeration of the applications table
        const isVerified = await redis.get(`reg-verified:${normalizedEmail}`);
        if (!isVerified) {
            // Verification is intentionally ephemeral. Do not consult a
            // permanent DB flag: knowing an old email must never be enough to
            // claim an application later.
            return NextResponse.json({ hasApplication: false, name: null });
        }

        const result = await query(
            'SELECT id, name FROM applications WHERE email_blind_index = $1',
            [emailBlindIndex]
        );

        return NextResponse.json({
            hasApplication: result.rows.length > 0,
            name: result.rows[0]?.name || null,
        });
    } catch (e) {
        console.error('[Check Application Error]', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
