import { NextResponse } from 'next/server';
import { getCachedData } from '@/lib/cache/cache';
import { getLevel0MonthlyPodiums } from '@/lib/leaderboard/monthly';

export async function GET() {
    try {
        const podiums = await getCachedData('leaderboard:monthly:level0:v2', 600, getLevel0MonthlyPodiums);
        return NextResponse.json({ success: true, months: podiums }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=120, stale-while-revalidate=600' } });
    } catch (error) {
        console.error('[MonthlyLeaderboard] Error:', error);
        return NextResponse.json({ success: false, months: [] }, { status: 500 });
    }
}
