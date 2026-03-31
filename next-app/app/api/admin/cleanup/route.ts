import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/cleanup
 * Runs the retention cleanup for old tracking data.
 * Protected by a secret header (for cron jobs).
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-admin-secret');
    if (!process.env.ADMIN_SECRET_TOKEN || secret !== process.env.ADMIN_SECRET_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Run cleanup
        const results = {
            activity: 0,
            navigation: 0,
            errors: 0,
            sessions: 0,
            logins: 0,
        };

        const r1 = await query("DELETE FROM user_activity WHERE created_at < NOW() - INTERVAL '90 days'");
        results.activity = r1.rowCount || 0;

        const r2 = await query("DELETE FROM page_navigation WHERE entered_at < NOW() - INTERVAL '90 days'");
        results.navigation = r2.rowCount || 0;

        const r3 = await query("DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days'");
        results.errors = r3.rowCount || 0;

        const r4 = await query("DELETE FROM user_sessions WHERE started_at < NOW() - INTERVAL '90 days'");
        results.sessions = r4.rowCount || 0;

        const r5 = await query("DELETE FROM login_logs WHERE logged_in_at < NOW() - INTERVAL '180 days'");
        results.logins = r5.rowCount || 0;

        return NextResponse.json({ success: true, deleted: results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
