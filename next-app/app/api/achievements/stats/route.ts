import { NextResponse } from 'next/server';
import { getServerHolderStats } from '@/lib/achievements/stats-server';

/** How many members hold each badge, out of all members. Cached for 10 minutes. */
export async function GET() {
    try {
        const data = await getServerHolderStats();
        return NextResponse.json(data, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
