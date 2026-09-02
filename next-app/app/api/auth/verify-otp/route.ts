import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { redis } from '@/lib/db/redis';
import crypto from 'crypto';
import { getClientIp } from '@/lib/security/request';

const CODE_RE = /^\d{6}$/;
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }
        const ip = getClientIp(req);

        const { email, code } = await req.json();
        if (typeof email !== 'string' || typeof code !== 'string' || !email || !code || email.length > 254) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }
        if (!CODE_RE.test(code)) {
            return NextResponse.json({ error: 'Invalid code format.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Rate-limit by both IP and email to stop distributed brute-force
        const limitByIp = await rateLimit(`verify-otp:${ip}`, 5, 300);
        const limitByEmail = await rateLimit(`verify-otp-email:${normalizedEmail}`, 5, 300);
        if (!limitByIp.success || !limitByEmail.success) {
            return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
        }
        const otpKey = `reg-otp:${normalizedEmail}`;

        const stored = await redis.get(otpKey);
        if (!stored) {
            return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
        }

        const storedBytes = Buffer.from(stored, 'utf8');
        const providedBytes = Buffer.from(code, 'utf8');
        if (storedBytes.length !== providedBytes.length || !crypto.timingSafeEqual(storedBytes, providedBytes)) {
            return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
        }

        // Code matches — delete OTP and mark email as verified in Redis + DB
        await redis.del(otpKey);
        await redis.set(`reg-verified:${normalizedEmail}`, '1', 'EX', 600);

        return NextResponse.json({ success: true, message: 'Email verified.' });

    } catch {
        return NextResponse.json({ error: 'Failed to verify code.' }, { status: 500 });
    }
}
