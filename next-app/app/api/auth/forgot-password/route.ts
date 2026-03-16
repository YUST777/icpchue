import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createBlindIndex } from '@/lib/encryption';
import { query } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';
import { redis } from '@/lib/redis';

const TOKEN_TTL = 3600; // 1 hour

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitResult = await rateLimit(`forgot-pwd:${ip}`, 3, 900);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
        }

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const blindIndex = createBlindIndex(normalizedEmail);

        const userResult = await query(
            'SELECT id, supabase_uid FROM users WHERE email_blind_index = $1',
            [blindIndex]
        );

        if (userResult.rows.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a reset link has been sent.'
            });
        }

        const { supabase_uid } = userResult.rows[0];
        const token = randomBytes(32).toString('hex');

        // Invalidate any previous token for this user
        const oldToken = await redis.get(`pwd-reset-user:${supabase_uid}`);
        if (oldToken) {
            await redis.del(`pwd-reset:${oldToken}`);
        }

        // Store new token and a reverse mapping (user -> token) for invalidation
        const pipeline = redis.pipeline();
        pipeline.set(`pwd-reset:${token}`, JSON.stringify({ supabaseUid: supabase_uid, email: normalizedEmail }), 'EX', TOKEN_TTL);
        pipeline.set(`pwd-reset-user:${supabase_uid}`, token, 'EX', TOKEN_TTL);
        await pipeline.exec();

        const resetLink = `https://icpchue.com/reset-password?token=${token}`;

        try {
            await sendPasswordResetEmail(normalizedEmail, resetLink);
        } catch {
            // Email send failed — still return success to avoid enumeration
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.'
        });

    } catch {
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
