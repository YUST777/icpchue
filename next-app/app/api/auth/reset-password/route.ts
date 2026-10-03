import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { query } from '@/lib/db/db';

const MAX_BODY_BYTES = 16 * 1024;
// Recovery sessions come from the emailed link; refuse stale ones.
const MAX_RECOVERY_AGE_SECONDS = 60 * 60;

type JwtClaims = { amr?: Array<{ method?: string; timestamp?: number }> };

function decodeClaims(token: string): JwtClaims | null {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

/**
 * Completes a Supabase Auth password recovery. The browser sends the
 * short-lived access token that Supabase put in the reset link's URL
 * fragment; we verify it with Supabase, then set the new password.
 */
export async function POST(req: NextRequest) {
    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
            return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 });
        }
        const ip = getClientIp(req);
        const limitResult = await rateLimit(`reset-pwd-v2:${ip}`, 10, 300);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        let accessToken = body?.accessToken;
        const tokenHash = body?.tokenHash;
        const newPassword = body?.newPassword;

        if (typeof newPassword !== 'string' || !newPassword) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
        }
        if (newPassword.length < 9 || !/[A-Z]/.test(newPassword)) {
            return NextResponse.json({ error: 'Password must be at least 9 characters with at least one uppercase letter' }, { status: 400 });
        }

        // Preferred flow: the email links to /reset-password?token_hash=...
        // The one-time token is only spent here, when the student submits
        // the form. Outlook/Defender link scanners only GET the page, so
        // they can no longer burn the link before the student opens it.
        if (typeof tokenHash === 'string' && tokenHash) {
            if (tokenHash.length > 512 || !/^[A-Za-z0-9_-]+$/.test(tokenHash)) {
                return NextResponse.json({ error: 'Reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
            }
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseAnonKey) {
                return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 });
            }
            const anon = createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
            const { data: verified, error: verifyError } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
            if (verifyError || !verified.session) {
                console.warn('[Reset Password] Recovery token rejected:', verifyError?.status, verifyError?.code, verifyError?.message);
                return NextResponse.json({ error: 'This reset link has expired or was already used. Please request a new one.' }, { status: 400 });
            }
            accessToken = verified.session.access_token;
        }

        if (typeof accessToken !== 'string' || !accessToken) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
        }
        if (accessToken.length > 4096 || newPassword.length > 256) {
            return NextResponse.json({ error: 'Request is too large.' }, { status: 400 });
        }
        if (newPassword.length < 9 || !/[A-Z]/.test(newPassword)) {
            return NextResponse.json({ error: 'Password must be at least 9 characters with at least one uppercase letter' }, { status: 400 });
        }

        // Only accept sessions created by an emailed one-time link (amr
        // "recovery"/"otp"), recently. A normal password-login session cannot
        // be used here to change the password without the email step.
        const claims = decodeClaims(accessToken);
        const nowSeconds = Math.floor(Date.now() / 1000);
        const viaEmailLink = claims?.amr?.some((entry) =>
            (entry.method === 'recovery' || entry.method === 'otp') &&
            typeof entry.timestamp === 'number' &&
            nowSeconds - entry.timestamp <= MAX_RECOVERY_AGE_SECONDS
        );
        if (!viaEmailLink) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        // Verifies the signature and that the session is still active.
        const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
        if (userError || !userData.user) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
        }

        const linked = await query('SELECT 1 FROM users WHERE supabase_uid = $1 LIMIT 1', [userData.user.id]);
        if (linked.rows.length === 0) {
            return NextResponse.json({ error: 'No ICPC HUE account is linked to this email.' }, { status: 400 });
        }

        const { error } = await adminClient.auth.admin.updateUserById(userData.user.id, { password: newPassword });
        if (error) {
            console.error('[Reset Password] Supabase password update failed:', error.status, error.code, error.message);
            return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
        }

        // End the recovery session and any other sessions using the old password.
        const { error: signOutError } = await adminClient.auth.admin.signOut(accessToken, 'global');
        // Supabase may already have ended the session on password change.
        if (signOutError && signOutError.name !== 'AuthSessionMissingError') {
            console.warn('[Reset Password] Could not revoke sessions:', signOutError.message);
        }

        return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('[Reset Password] Unexpected failure:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
