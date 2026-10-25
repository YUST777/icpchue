import { NextRequest, NextResponse } from 'next/server';
import { grantProgressAchievementsForAll } from '@/lib/services/achievements';

export const maxDuration = 60;

/**
 * Daily Vercel cron (see vercel.json). Grants earned progress badges to members
 * who have not opened the site. Needs CRON_SECRET, like the other cron routes.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 });
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await grantProgressAchievementsForAll();
    return NextResponse.json({ success: true, ...result });
}
