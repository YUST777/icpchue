import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { getLevel0MonthlyPodiums } from '@/lib/leaderboard/monthly';

export async function GET(req: NextRequest) {
    // Names and student IDs: members only, never the open internet.
    if (!(await verifyAuth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const podiums = await getCachedData('leaderboard:monthly:level0:v3', 600, getLevel0MonthlyPodiums);
        return NextResponse.json({ success: true, months: podiums }, { headers: { 'Cache-Control': 'private, max-age=60' } });
    } catch (error) {
        console.error('[MonthlyLeaderboard] Error:', error);
        return NextResponse.json({ success: false, months: [] }, { status: 500 });
    }
}
