import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getCachedData } from '@/lib/cache/cache';

// Cache for 1 hour to handle "Low Cost" requirement
const CACHE_KEY = 'cf:problem_stats';
const TTL = 3600;

interface ProblemStats {
    rating?: number;
    solvedCount: number;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const contestId = searchParams.get('contestId');
    const index = searchParams.get('index')?.toUpperCase();

    // Auth & Rate Limit: 5 per 60s
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ratelimit = await rateLimit(`cf_problem_stats:${user.id}`, 5, 60);
    if (!ratelimit.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!contestId || !index) {
        return NextResponse.json({ error: 'Missing contestId or index' }, { status: 400 });
    }

    try {
        const statsMap = await getCachedData<Record<string, ProblemStats>>(CACHE_KEY, TTL, async () => {
            const res = await fetch('https://codeforces.com/api/problemset.problems');

            if (!res.ok) throw new Error(`CF API responded with ${res.status}`);

            const data = await res.json();
            if (data.status !== 'OK') throw new Error(`CF API status: ${data.status}`);

            const newCache: Record<string, ProblemStats> = {};
            const problems = data.result.problems;
            const statistics = data.result.problemStatistics;

            for (let i = 0; i < problems.length; i++) {
                const p = problems[i];
                const s = statistics[i];
                const key = `${p.contestId}-${p.index}`;
                newCache[key] = {
                    rating: p.rating,
                    solvedCount: s.solvedCount
                };
            }

            return newCache;
        });

        const key = `${contestId}-${index}`;
        const stats = statsMap[key];

        if (!stats) {
            // Return null or empty object if not found, to match previous behavior
            // Previous behavior returned null explicitly if stats[key] didn't exist
            return NextResponse.json(null);
        }

        return NextResponse.json(stats);

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch Codeforces data' }, { status: 502 });
    }
}
