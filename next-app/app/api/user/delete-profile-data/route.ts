import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const authUser = await verifyAuth(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;
        const body = await request.json();
        const { field } = body; // 'telegram' or 'codeforces'

        if (!field || !['telegram', 'codeforces'].includes(field)) {
            return NextResponse.json({ error: 'Invalid field. Use "telegram" or "codeforces".' }, { status: 400 });
        }

        // Get user to find application_id
        const userResult = await query('SELECT application_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const applicationId = userResult.rows[0].application_id;

        if (field === 'telegram') {
            // Clear telegram_username from users table
            await query('UPDATE users SET telegram_username = NULL WHERE id = $1', [userId]);
            // Clear from applications if exists
            if (applicationId) {
                await query('UPDATE applications SET telegram_username = NULL WHERE id = $1', [applicationId]);
            }
        } else if (field === 'codeforces') {
            // Clear codeforces data from users table
            await query('UPDATE users SET codeforces_handle = NULL, codeforces_data = NULL WHERE id = $1', [userId]);
            // Clear from applications if exists
            if (applicationId) {
                await query('UPDATE applications SET codeforces_profile = NULL, codeforces_data = NULL WHERE id = $1', [applicationId]);
            }
        }

        // Invalidate relevant caches
        const { invalidateCache } = await import('@/lib/cache');
        await invalidateCache(`user:${userId}:profile`);
        await invalidateCache(`user:${userId}:dashboard_stats`);
        if (field === 'codeforces') {
            await invalidateCache('leaderboard:codeforces');
        }

        return NextResponse.json({ success: true, message: `${field} data deleted successfully` });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
