import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { getClientIp } from '@/lib/security/request';
import { createClient } from '@supabase/supabase-js';
import { findAuthUserByEmail } from '@/lib/supabase/admin';

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

        // Supabase Auth is the source of truth for registration OTPs. The
        // application database can have a rotated blind-index key, so check
        // Auth as a second duplicate guard before asking it to send a code.
        const authUser = await findAuthUserByEmail(normalizedEmail);
        if (authUser) {
            const isPendingRegistration = authUser.user_metadata?.icpchue_registration === true;
            if (isPendingRegistration && authUser.email_confirmed_at) {
                return NextResponse.json({
                    success: true,
                    alreadyVerified: true,
                    message: 'Email already verified. Continue registration.'
                });
            }
            if (!isPendingRegistration) {
                return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
            }
        }

        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseAnonKey) {
                return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            });
            const { error } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true,
                    data: { icpchue_registration: true },
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('[Send OTP] Supabase Auth delivery failed:', error instanceof Error ? error.message : error);
            return NextResponse.json({ error: 'Could not send verification email. Please try again later.' }, { status: 503 });
        }

        return NextResponse.json({ success: true, message: 'Verification code sent.' });
    } catch {
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
