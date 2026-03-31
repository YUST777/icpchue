import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { createBlindIndex } from '@/lib/security/encryption';
import { rateLimit } from '@/lib/cache/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const rl = await rateLimit(`check-email:${ip}`, 10, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailBlindIndex = createBlindIndex(normalizedEmail);

        // Check applications table
        const result = await query(
            'SELECT id FROM applications WHERE email_blind_index = $1',
            [emailBlindIndex]
        );

        // Check users table
        const userResult = await query(
            'SELECT id FROM users WHERE email_blind_index = $1',
            [emailBlindIndex]
        );

        return NextResponse.json({
            success: true,
            status: result.rows.length > 0 ? (userResult.rows.length > 0 ? 'exists' : 'application_found') : 'not_found',
            message: 'Email check completed.'
        });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
