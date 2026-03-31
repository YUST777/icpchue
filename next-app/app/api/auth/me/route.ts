import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { decrypt } from '@/lib/security/encryption';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { CACHE_VERSION } from '@/lib/cache/cache-version';

export async function GET(req: NextRequest) {
    try {
        // Use existing auth lib helper
        const authUser = await verifyAuth(req);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch profile directly — no longer need sheet_1_solved/is_approval_unlocked from users table
        const userResult = await query(
            'SELECT id, email, is_verified, last_login_at, created_at, application_id, telegram_username, role, profile_picture, codeforces_handle, codeforces_data FROM users WHERE id = $1',
            [authUser.id]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userResult.rows[0];
        const decryptedEmail = decrypt(user.email) || user.email;

        // Fetch Application/Profile details
        let profile: any = null;
        if (user.application_id) {
            const appResult = await query('SELECT * FROM applications WHERE id = $1', [user.application_id]);
            if (appResult.rows.length > 0) {
                profile = appResult.rows[0];
            }
        }

        if (!profile) profile = {};

        // Prioritize live data from 'users' table over stale 'applications' data
        if (user.codeforces_data) {
            profile.codeforces_data = typeof user.codeforces_data === 'string'
                ? JSON.parse(user.codeforces_data)
                : user.codeforces_data;
        } else if (profile.codeforces_data && typeof profile.codeforces_data === 'string') {
            try {
                profile.codeforces_data = JSON.parse(profile.codeforces_data);
            } catch {
                // It's fine
            }
        }

        // Fallback for codeforces profile if not in application but present in user
        if (!profile.codeforces_profile && user.codeforces_handle) {
            profile.codeforces_profile = user.codeforces_handle;
        }

        // Fetch user achievements and derive status flags from them
        const achievementResult = await query(
            'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
            [user.id]
        );
        const achievementIds = achievementResult.rows.map((r: { achievement_id: string }) => r.achievement_id);
        profile.achievements = achievementIds;

        // Derive achievement flags from the achievements table (single source of truth)
        profile.sheet_1_solved = achievementIds.includes('sheet-1');
        profile.is_approval_unlocked = achievementIds.includes('approval');

        // Sync telegram username if missing in profile but present in user
        if (!profile.telegram_username && user.telegram_username) {
            profile.telegram_username = user.telegram_username;
        }

        const data = {
            user: {
                id: user.id,
                email: decryptedEmail,
                isVerified: user.is_verified,
                lastLogin: user.last_login_at,
                createdAt: user.created_at,
                role: user.role || 'trainee',
                profile_picture: user.profile_picture || null,
                codeforces_handle: user.codeforces_handle || null
            },
            profile
        };

        return NextResponse.json({
            success: true,
            ...data
        });

    } catch (error: any) {
        if (error.message === 'User not found') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
