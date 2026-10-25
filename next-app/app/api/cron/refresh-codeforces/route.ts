import { NextRequest, NextResponse } from 'next/server';
import { refreshCodeforcesRatings } from '@/lib/services/cf-batch-refresh';

export const maxDuration = 60;

/**
 * Daily Vercel cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`;
 * set CRON_SECRET in the project's environment variables for this route to run.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 });
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await refreshCodeforcesRatings(12);
    return NextResponse.json({ success: true, ...result });
}
