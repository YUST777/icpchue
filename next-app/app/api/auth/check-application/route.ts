import { NextRequest, NextResponse } from 'next/server';
import { createBlindIndex } from '@/lib/security/encryption';
import { query } from '@/lib/db/db';
import { sanitizeInput } from '@/lib/security/validation';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { findAuthUserByEmail } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        const limitResult = await rateLimit(`check-app:${ip}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
        }

        const { email } = await req.json();
        if (typeof email !== 'string' || !email || email.length > 254) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const normalizedEmail = sanitizeInput(email).toLowerCase();
        const emailBlindIndex = createBlindIndex(normalizedEmail);

        // Security: Only allow this check for emails that have been verified by
        // Supabase Auth during the current registration flow. This prevents
        // unauthenticated enumeration of the applications table without a
        // Redis dependency.
        const authUser = await findAuthUserByEmail(normalizedEmail);
        if (!authUser || !authUser.email_confirmed_at || authUser.user_metadata?.icpchue_registration !== true) {
            return NextResponse.json({ hasApplication: false, name: null });
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
