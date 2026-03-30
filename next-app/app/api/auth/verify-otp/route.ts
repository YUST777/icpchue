import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { redis } from '@/lib/db/redis';
import { query } from '@/lib/db/db';
import { createBlindIndex } from '@/lib/security/encryption';

const CODE_RE = /^\d{6}$/;

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

        const { email, code } = await req.json();
        if (!email || !code) {
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

        if (stored !== code) {
            return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
        }

        // Code matches — delete OTP and mark email as verified in Redis + DB
        await redis.del(otpKey);
        await redis.set(`reg-verified:${normalizedEmail}`, '1', 'EX', 600);

        // Persist in DB so user won't be asked again if they close the tab
        const blindIndex = createBlindIndex(normalizedEmail);
        try {
            await query(
                `INSERT INTO email_verifications (email_blind_index, verified_at)
                 VALUES ($1, NOW())
                 ON CONFLICT (email_blind_index) DO UPDATE SET verified_at = NOW()`,
                [blindIndex]
            );
        } catch {
            // Table might not exist yet — create it
            await query(`
                CREATE TABLE IF NOT EXISTS email_verifications (
                    email_blind_index TEXT PRIMARY KEY,
                    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);
            await query(
                `INSERT INTO email_verifications (email_blind_index, verified_at) VALUES ($1, NOW()) ON CONFLICT (email_blind_index) DO UPDATE SET verified_at = NOW()`,
                [blindIndex]
            );
        }

        return NextResponse.json({ success: true, message: 'Email verified.' });

    } catch {
        return NextResponse.json({ error: 'Failed to verify code.' }, { status: 500 });
    }
}
