import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { getClientIp } from '@/lib/security/request';
import { createClient } from '@supabase/supabase-js';
import { findAuthUserByEmail } from '@/lib/supabase/admin';
import { isHorusEmail, normalizeHorusEmail } from '@/lib/auth/horus-email';

const MAX_BODY_BYTES = 8 * 1024;

function retryAfterSeconds(reset: number) {
    return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }

        const body = await req.json().catch(() => null);
        const rawEmail = body?.email;
        if (typeof rawEmail !== 'string' || !rawEmail.trim() || rawEmail.length > 254) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = normalizeHorusEmail(rawEmail);

        if (!isHorusEmail(normalizedEmail)) {
            return NextResponse.json({
                error: 'Use your Horus University email (your student ID followed by @horus.edu.eg).'
            }, { status: 400 });
        }

        const ip = getClientIp(req);
        // Campus and mobile networks commonly share one public IP. Keep an IP
        // guard for abuse, but do not let a few students exhaust the bucket.
        // The versioned key also clears buckets created by the old 5-request
        // policy after deployment.
        const limitByIp = await rateLimit(`send-otp-v2:${ip}`, 30, 300);
        if (!limitByIp.success) {
            return NextResponse.json(
                { error: 'Too many requests from this network. Please wait a few minutes and try again.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(limitByIp.reset)) } }
            );
        }

        // Also rate-limit per email to prevent inbox flooding from different IPs
        const limitByEmail = await rateLimit(`send-otp-email:${normalizedEmail}`, 3, 300);
        if (!limitByEmail.success) {
            return NextResponse.json(
                { error: 'Too many codes sent to this email. Please wait a few minutes.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(limitByEmail.reset)) } }
            );
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
                    email: normalizedEmail,
                    message: 'Email already verified. Continue registration.'
                });
            }
            if (!isPendingRegistration) {
                return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
            }
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[Send OTP] Supabase public configuration is missing.');
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
        if (error) {
            console.error('[Send OTP] Supabase Auth delivery failed:', error.status, error.code, error.message);
            if (error.status === 429) {
                return NextResponse.json(
                    { error: 'Too many verification emails right now. Please wait a minute and try again.' },
                    { status: 429, headers: { 'Retry-After': '60' } }
                );
            }
            return NextResponse.json({ error: 'Could not send verification email. Please try again in a minute.' }, { status: 503 });
        }

        return NextResponse.json({ success: true, email: normalizedEmail, message: 'Verification code sent.' });
    } catch (error) {
        console.error('[Send OTP] Unexpected failure:', error instanceof Error ? `${error.name}: ${error.message}` : error);
        return NextResponse.json({ error: 'We could not send the code right now. Please try again in a minute.' }, { status: 500 });
    }
}
