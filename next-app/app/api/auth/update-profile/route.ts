import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { sanitizeInput } from '@/lib/validation';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult;

    try {
        const body = await req.json();
        const telegram_username = body.telegram_username;

        // Only update if provided (can be empty string to clear?)
        // Express logic: if (telegram_username !== undefined)
        if (telegram_username !== undefined) {
            let sanitizedTelegram = sanitizeInput(telegram_username);
            // Express logic: .replace(/^@/, '').substring(0, 32);
            sanitizedTelegram = sanitizedTelegram.replace(/^@/, '').substring(0, 32);

            await query('UPDATE users SET telegram_username = $1 WHERE id = $2', [sanitizedTelegram, user.id]);

            if (user.applicationId) {
                await query('UPDATE applications SET telegram_username = $1 WHERE id = $2', [sanitizedTelegram, user.applicationId]);
            }

            // Invalidate profile cache so next fetch gets updated data
            await invalidateCache(`user:${user.id}:profile`);
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated'
        });

    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
