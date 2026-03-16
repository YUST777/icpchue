import { NextRequest, NextResponse } from 'next/server';
import { createBlindIndex } from '@/lib/encryption';
import { query } from '@/lib/db';
import { sanitizeInput } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitResult = await rateLimit(`check-app:${ip}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const normalizedEmail = sanitizeInput(email).toLowerCase();
        const emailBlindIndex = createBlindIndex(normalizedEmail);

        // Security: Only allow this check for emails that have been OTP-verified
        // This prevents unauthenticated enumeration of the applications table
        const isVerified = await redis.get(`reg-verified:${normalizedEmail}`);
        if (!isVerified) {
            // Also accept DB-persisted verification for users who closed the tab
            const dbVerified = await query(
                'SELECT 1 FROM email_verifications WHERE email_blind_index = $1',
                [emailBlindIndex]
            ).catch(() => ({ rows: [] }));
            if (dbVerified.rows.length === 0) {
                // Not verified — return hasApplication: false without revealing anything
                return NextResponse.json({ hasApplication: false, name: null });
            }
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
