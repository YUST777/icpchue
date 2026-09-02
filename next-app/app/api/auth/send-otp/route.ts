import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { redis } from '@/lib/db/redis';
import { sendOtpEmail } from '@/lib/services/email';
import { getClientIp } from '@/lib/security/request';

const OTP_TTL = 300; // 5 minutes
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }
        const ip = getClientIp(req);
        const limitByIp = await rateLimit(`send-otp:${ip}`, 5, 300);
        if (!limitByIp.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const { email } = await req.json();
        if (typeof email !== 'string' || !email || email.length > 254) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@horus\.edu\.eg$/i.test(normalizedEmail)) {
            return NextResponse.json({ error: 'Use your Horus University email address.' }, { status: 400 });
        }

        // Also rate-limit per email to prevent inbox flooding from different IPs
        const limitByEmail = await rateLimit(`send-otp-email:${normalizedEmail}`, 3, 300);
        if (!limitByEmail.success) {
            return NextResponse.json({ error: 'Too many codes sent to this email. Please wait a few minutes.' }, { status: 429 });
        }
        const blindIndex = createBlindIndex(normalizedEmail);
        const existingUser = await query(
            'SELECT id FROM users WHERE email_blind_index = $1',
            [blindIndex]
        );
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
        }

        const code = String(randomInt(100000, 1000000));
        await redis.set(`reg-otp:${normalizedEmail}`, code, 'EX', OTP_TTL);

        try {
            await sendOtpEmail(normalizedEmail, code);
        } catch (error) {
            // Do not leave a usable OTP behind when delivery failed.
            await redis.del(`reg-otp:${normalizedEmail}`).catch(() => {});
            console.error('[Send OTP] Email delivery failed:', error);
            return NextResponse.json({ error: 'Could not send verification email. Please try again later.' }, { status: 503 });
        }

        return NextResponse.json({ success: true, message: 'Verification code sent.' });
    } catch {
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
