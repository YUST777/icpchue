import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

// GET: Fetch current privacy settings
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 10 per 60s per user
        const ratelimit = await rateLimit(`privacy_view:${user.id}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const result = await query(
            `SELECT show_on_cf_leaderboard, show_on_sheets_leaderboard, show_public_profile 
             FROM users WHERE id = $1`,
            [user.id]
        );

        const row = result.rows[0] || {};
        return NextResponse.json({
            success: true,
            showOnCfLeaderboard: row.show_on_cf_leaderboard ?? true,
            showOnSheetsLeaderboard: row.show_on_sheets_leaderboard ?? true,
            showPublicProfile: row.show_public_profile ?? true,
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Update privacy settings
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Rate limit: 10 per 60s per user
        const ratelimit = await rateLimit(`privacy_update:${user.id}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Support both old format (visibility: 'public'/'private') and new format (individual toggles)
        if (body.visibility !== undefined) {
            // Legacy: single visibility toggle
            const isPublic = body.visibility === 'public';
            await query(
                `UPDATE users SET 
                    profile_visibility = $1,
                    show_on_cf_leaderboard = $2,
                    show_on_sheets_leaderboard = $2,
                    show_public_profile = $2
                 WHERE id = $3`,
                [body.visibility, isPublic, user.id]
            );
            return NextResponse.json({ success: true, visibility: body.visibility });
        }

        // New: individual toggles — use safe parameterized query
        const { showOnCfLeaderboard, showOnSheetsLeaderboard, showPublicProfile } = body;

        // Whitelist approach: only allow known boolean fields
        const allowedFields: Record<string, string> = {
            showOnCfLeaderboard: 'show_on_cf_leaderboard',
            showOnSheetsLeaderboard: 'show_on_sheets_leaderboard',
            showPublicProfile: 'show_public_profile',
        };

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        for (const [key, column] of Object.entries(allowedFields)) {
            const val = body[key];
            if (typeof val === 'boolean') {
                setClauses.push(`${column} = $${idx++}`);
                values.push(val);
            }
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
        }

        values.push(user.id);
        await query(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}`,
            values
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
