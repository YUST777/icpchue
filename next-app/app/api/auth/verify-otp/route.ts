import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { createClient } from '@supabase/supabase-js';
import { findAuthUserByEmail } from '@/lib/supabase/admin';
import { isHorusEmail, normalizeHorusEmail } from '@/lib/auth/horus-email';

const CODE_RE = /^\d{6}$/;
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }
        const body = await req.json().catch(() => null);
        const email = body?.email;
        const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : body?.code;
        if (typeof email !== 'string' || typeof code !== 'string' || !email.trim() || !code || email.length > 254) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }
        if (!CODE_RE.test(code)) {
            return NextResponse.json({ error: 'Invalid code format.' }, { status: 400 });
        }

        const normalizedEmail = normalizeHorusEmail(email);
        if (!isHorusEmail(normalizedEmail)) {
            return NextResponse.json({ error: 'Use your Horus University email address.' }, { status: 400 });
        }

        // Rate-limit by both IP and email to stop distributed brute-force
        const ip = getClientIp(req);
        // Shared campus/mobile IPs can contain many legitimate students. The
        // per-email limiter below remains strict for brute-force protection.
        const limitByIp = await rateLimit(`verify-otp-v2:${ip}`, 30, 300);
        const limitByEmail = await rateLimit(`verify-otp-email:${normalizedEmail}`, 5, 300);
        if (!limitByIp.success || !limitByEmail.success) {
            const retryAfter = Math.max(1, Math.ceil((Math.max(limitByIp.reset, limitByEmail.reset) - Date.now()) / 1000));
            return NextResponse.json(
                { error: 'Too many attempts. Please request a new code in a few minutes.' },
                { status: 429, headers: { 'Retry-After': String(retryAfter) } }
            );
        }
        const authUser = await findAuthUserByEmail(normalizedEmail);
        if (!authUser) {
            return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
        }
        if (authUser.user_metadata?.icpchue_registration !== true) {
            return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 409 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await supabase.auth.verifyOtp({
            email: normalizedEmail,
            token: code,
            type: 'email',
        });
        if (error || !data.user) {
            if (error) console.warn('[Verify OTP] Code rejected:', error.status, error.code, error.message);
            return NextResponse.json({ error: 'Wrong or old code. Use the code from the NEWEST email (each new code cancels the previous one). الكود غلط أو قديم: استخدم الكود من آخر إيميل وصلك.' }, { status: 401 });
        }

        return NextResponse.json({ success: true, message: 'Email verified.' });

    } catch (error) {
        console.error('[Verify OTP] Supabase Auth verification failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to verify code.' }, { status: 500 });
    }
}
