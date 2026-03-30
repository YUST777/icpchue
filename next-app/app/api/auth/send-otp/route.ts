import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { redis } from '@/lib/db/redis';
import { sendOtpEmail } from '@/lib/services/email';

const OTP_TTL = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitByIp = await rateLimit(`send-otp:${ip}`, 5, 300);
        if (!limitByIp.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

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

        // Check if email was already verified (persistent DB check)
        try {
            const alreadyVerified = await query(
                'SELECT 1 FROM email_verifications WHERE email_blind_index = $1',
                [blindIndex]
            );
            if (alreadyVerified.rows.length > 0) {
                // Re-set Redis in case it expired, and tell frontend to skip OTP
                await redis.set(`reg-verified:${normalizedEmail}`, '1', 'EX', 600);
                return NextResponse.json({ success: true, alreadyVerified: true, message: 'Email already verified.' });
            }
        } catch {
            // Table doesn't exist yet — that's fine, proceed normally
        }

        const code = randomInt(100000, 999999).toString();
        await redis.set(`reg-otp:${normalizedEmail}`, code, 'EX', OTP_TTL);

        try {
            await sendOtpEmail(normalizedEmail, code);
        } catch {
            return NextResponse.json({ error: 'Failed to send verification email.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Verification code sent.' });

    } catch {
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
