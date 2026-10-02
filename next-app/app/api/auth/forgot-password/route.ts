import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { findAuthUserByEmail } from '@/lib/supabase/admin';
import { query } from '@/lib/db/db';

const MAX_BODY_BYTES = 8 * 1024;
// Must be listed in Supabase Auth → URL Configuration → Redirect URLs.
const RESET_REDIRECT_URL = 'https://icpchue.com/reset-password';
const GENERIC_MESSAGE = 'If an account exists with this email, a reset link has been sent.';

/**
 * Sends a password reset link through Supabase Auth (the same mailer as the
 * registration OTP). Supabase owns the one-time token, its expiry, and the
 * single-use guarantee, so nothing is stored by the app.
 */
export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }

        const ip = getClientIp(req);
        const limitByIp = await rateLimit(`forgot-pwd-v2:${ip}`, 20, 900);
        if (!limitByIp.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait before trying again.' }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        const email = body?.email;
        if (typeof email !== 'string' || !email.trim() || email.length > 254) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const limitByEmail = await rateLimit(`forgot-pwd-email:${normalizedEmail}`, 3, 900);
        if (!limitByEmail.success) {
            return NextResponse.json({ error: 'A reset link was already sent. Please check your inbox and Junk folder, or wait a few minutes.' }, { status: 429 });
        }

        // Only completed ICPC HUE accounts can reset a password. Pending OTP
        // registrations and unknown addresses get the same generic answer.
        const authUser = await findAuthUserByEmail(normalizedEmail);
        if (!authUser || authUser.user_metadata?.icpchue_registration === true) {
            return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
        }
        const linked = await query('SELECT 1 FROM users WHERE supabase_uid = $1 LIMIT 1', [authUser.id]);
        if (linked.rows.length === 0) {
            return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[Forgot Password] Supabase public configuration is missing.');
            return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
        }

        // Implicit flow: the link lands on /reset-password with a short-lived
        // recovery session in the URL fragment (never sent to our server logs).
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false, flowType: 'implicit' },
        });
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: RESET_REDIRECT_URL,
        });
        if (error) {
            console.error('[Forgot Password] Supabase recovery email failed:', error.status, error.code, error.message);
            if (error.status === 429) {
                return NextResponse.json({ error: 'Too many emails right now. Please try again in a minute.' }, { status: 429 });
            }
            return NextResponse.json({ error: 'Could not send the reset email. Please try again in a minute.' }, { status: 503 });
        }

        return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    } catch (error) {
        console.error('[Forgot Password] Unexpected failure:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
    }
}
