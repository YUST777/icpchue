import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redis } from '@/lib/db/redis';
import { rateLimit } from '@/lib/cache/rate-limit';

const TOKEN_RE = /^[0-9a-f]{64}$/;

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitResult = await rateLimit(`reset-pwd:${ip}`, 3, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        if (!TOKEN_RE.test(token)) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid.' }, { status: 400 });
        }

        if (newPassword.length < 9 || !/[A-Z]/.test(newPassword)) {
            return NextResponse.json({ error: 'Password must be at least 9 characters with at least one uppercase letter' }, { status: 400 });
        }

        // Atomic get-and-delete: read the value and delete in one round-trip
        // so two concurrent requests can't both consume the same token
        const data = await redis.getdel(`pwd-reset:${token}`);
        if (!data) {
            return NextResponse.json({ error: 'Reset link has expired or is invalid.' }, { status: 400 });
        }

        const { supabaseUid } = JSON.parse(data);

        const adminClient = createAdminClient();
        const { error } = await adminClient.auth.admin.updateUserById(supabaseUid, {
            password: newPassword,
        });

        if (error) {
            return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
        }

        // Also clean up the reverse mapping
        await redis.del(`pwd-reset-user:${supabaseUid}`).catch(() => {});

        return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });

    } catch {
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
