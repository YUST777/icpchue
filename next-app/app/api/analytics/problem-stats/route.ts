import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Returns analytics stats for a specific problem from our own DB.
 * Combines the user's submissions with all users' submissions for distribution.
 * Works for group contests where CF public API fails.
 */
export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`analytics:${user.id}`, 20, 60);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { searchParams } = new URL(req.url);
    const contestId = searchParams.get('contestId');
    const problemIndex = searchParams.get('problemIndex');

    if (!contestId || !problemIndex) {
        return NextResponse.json({ error: 'Missing contestId or problemIndex' }, { status: 400 });
    }

    try {
        // Get ALL accepted submissions for this problem (all users)
        const globalResult = await query(
            `SELECT time_ms, memory_kb FROM cf_submissions
             WHERE contest_id = $1 AND problem_index = $2 AND verdict = 'Accepted'
             ORDER BY time_ms ASC`,
            [contestId, problemIndex.toUpperCase()]
        );

        // Get user's own accepted submissions
        const userResult = await query(
            `SELECT time_ms, memory_kb FROM cf_submissions
             WHERE user_id = $1 AND contest_id = $2 AND problem_index = $3 AND verdict = 'Accepted'
             ORDER BY time_ms ASC`,
            [user.id, contestId, problemIndex.toUpperCase()]
        );

        const allAccepted = globalResult.rows;
        const userAccepted = userResult.rows;

        if (allAccepted.length === 0) {
            return NextResponse.json({ success: true, totalAccepted: 0 });
        }

        const times = allAccepted.map((r: any) => r.time_ms).sort((a: number, b: number) => a - b);
        const memories = allAccepted.map((r: any) => r.memory_kb).sort((a: number, b: number) => a - b);

        const runtimeDist = buildDistribution(times, 'ms');
        const memoryDist = buildDistribution(memories, 'KB');

        let userStats = null;
        if (userAccepted.length > 0) {
            const userBestTime = Math.min(...userAccepted.map((r: any) => r.time_ms));
            const userBestMem = Math.min(...userAccepted.map((r: any) => r.memory_kb));

            // Mark user's bucket
            for (const b of runtimeDist) {
                b.isUser = userBestTime >= b.rangeStart && userBestTime < b.rangeEnd;
            }
            for (const b of memoryDist) {
                b.isUser = userBestMem >= b.rangeStart && userBestMem < b.rangeEnd;
            }

            // Calculate percentiles
            let slowerCount = 0, moreMemCount = 0;
            for (const b of runtimeDist) {
                if (b.rangeStart > userBestTime) slowerCount += b.count;
                else if (b.rangeStart <= userBestTime && b.rangeEnd > userBestTime) slowerCount += Math.round(b.count * 0.5);
            }
            for (const b of memoryDist) {
                if (b.rangeStart > userBestMem) moreMemCount += b.count;
                else if (b.rangeStart <= userBestMem && b.rangeEnd > userBestMem) moreMemCount += Math.round(b.count * 0.5);
            }

            userStats = {
                runtime: { value: userBestTime, percentile: Math.min(99, Math.max(1, Math.round((slowerCount / allAccepted.length) * 100))) },
                memory: { value: userBestMem, percentile: Math.min(99, Math.max(1, Math.round((moreMemCount / allAccepted.length) * 100))) },
            };
        }

        return NextResponse.json({
            success: true,
            totalAccepted: allAccepted.length,
            runtimeDistribution: runtimeDist,
            memoryDistribution: memoryDist,
            userStats,
        });
    } catch (err) {
        console.error('[analytics/problem-stats] Error:', err);
        return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
    }
}

function buildDistribution(sortedValues: number[], unit: string) {
    if (sortedValues.length === 0) return [];
    const min = sortedValues[0];
    const max = sortedValues[sortedValues.length - 1];
    const bucketCount = 12;
    const step = Math.max(1, Math.ceil((max - min + 1) / bucketCount));

    return Array.from({ length: bucketCount }, (_, i) => {
        const rangeStart = min + i * step;
        const rangeEnd = rangeStart + step;
        const count = sortedValues.filter(v => v >= rangeStart && v < rangeEnd).length;
        let label: string;
        if (unit === 'KB' && rangeStart >= 1024) {
            label = `${(rangeStart / 1024).toFixed(0)}-${(rangeEnd / 1024).toFixed(0)}MB`;
        } else {
            label = `${Math.round(rangeStart)}-${Math.round(rangeEnd)}${unit}`;
        }
        return { label, count, rangeStart, rangeEnd, isUser: false };
    });
}
