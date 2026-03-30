import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sheetId = searchParams.get('sheetId');
        const problemId = searchParams.get('problemId');

        if (!sheetId || !problemId) {
            return NextResponse.json({ error: 'Missing sheetId or problemId' }, { status: 400 });
        }

        // Fetch accepted submissions for valid stats
        const result = await query(
            `SELECT user_id, time_ms, memory_kb 
             FROM training_submissions 
             WHERE sheet_id = $1 AND problem_id = $2 AND verdict = 'Accepted'`,
            [sheetId, problemId]
        );

        const submissions = result.rows;

        // Bucketing Runtime (ms)
        const times = submissions.map(s => s.time_ms).filter(t => t !== null && t !== undefined).sort((a, b) => a - b);

        let runtimePercentile: number | null = null;
        let userTime: number | null = null;
        let memoryPercentile: number | null = null;
        let userMemory: number | null = null;

        // Find user's best submission (min time, min memory)
        const userSubmissions = submissions.filter(s => s.user_id === user.id);
        if (userSubmissions.length > 0) {
            // Best time
            const bestTimeSub = userSubmissions.reduce((prev, curr) =>
                (prev.time_ms !== null && curr.time_ms !== null && prev.time_ms < curr.time_ms) ? prev : curr
            );
            userTime = bestTimeSub.time_ms;

            // Calculate Runtime Percentile (Beats X%)
            // Formula: (Count of people with time > userTime) / Total * 100
            // Or (Count of people with time >= userTime) ... strict beats means time > userTime
            if (userTime !== null) {
                const target = userTime;
                const slowerCount = times.filter(t => t > target).length;
                runtimePercentile = (slowerCount / times.length) * 100;
            }

            // Best memory
            const bestMemSub = userSubmissions.reduce((prev, curr) =>
                (prev.memory_kb !== null && curr.memory_kb !== null && prev.memory_kb < curr.memory_kb) ? prev : curr
            );
            userMemory = bestMemSub.memory_kb;
        }

        // If no data
        if (times.length === 0) {
            return NextResponse.json({
                runtimeDistribution: [],
                memoryDistribution: [],
                totalSubmissions: 0,
                userStats: null
            });
        }

        // Runtime Buckets (e.g. 5ms intervals or adaptive)
        const minTime = times[0];
        const maxTime = times[times.length - 1];
        const timeRange = Math.max(1, maxTime - minTime); // prevent zero range
        const bucketCount = Math.min(20, Math.max(5, Math.ceil(timeRange / 10)));
        const timeStep = Math.max(1, Math.ceil(timeRange / bucketCount));

        const runtimeMap = new Map<string, number>();

        times.forEach(t => {
            const bucketStart = Math.floor((t - minTime) / timeStep) * timeStep + minTime;
            const key = bucketStart;
            runtimeMap.set(String(key), (runtimeMap.get(String(key)) || 0) + 1);
        });

        const runtimeDistribution = Array.from(runtimeMap.entries())
            .map(([rangeStart, count]) => ({
                range: parseInt(rangeStart),
                count,
                label: `${rangeStart}ms`,
                isUser: userTime !== null && userTime >= parseInt(rangeStart) && userTime < parseInt(rangeStart) + timeStep
            }))
            .sort((a, b) => a.range - b.range);


        // Memory Buckets (KB)
        const memories = submissions.map(s => s.memory_kb).filter(m => m !== null && m !== undefined).sort((a, b) => a - b);

        // Calculate Memory Percentile
        if (userMemory !== null && memories.length > 0) {
            const moreMemCount = memories.filter(m => m > userMemory).length;
            memoryPercentile = (moreMemCount / memories.length) * 100;
        }

        const minMem = memories[0] || 0;
        const maxMem = memories[memories.length - 1] || 0;
        const memRange = Math.max(1, maxMem - minMem);
        const memBucketCount = Math.min(20, Math.max(5, Math.ceil(memRange / 128)));
        const memStep = Math.max(1, Math.ceil(memRange / memBucketCount));

        const memoryMap = new Map<string, number>();

        memories.forEach(m => {
            const bucketStart = Math.floor((m - minMem) / memStep) * memStep + minMem;
            const key = bucketStart;
            memoryMap.set(String(key), (memoryMap.get(String(key)) || 0) + 1);
        });

        const memoryDistribution = Array.from(memoryMap.entries())
            .map(([rangeStart, count]) => ({
                range: parseInt(rangeStart),
                count,
                label: `${Math.round(parseInt(rangeStart) / 1024 * 10) / 10}MB`,
                isUser: userMemory !== null && userMemory >= parseInt(rangeStart) && userMemory < parseInt(rangeStart) + memStep
            }))
            .sort((a, b) => a.range - b.range);


        // Cache stats for 30 seconds to reduce load (distribution doesn't change rapidly)
        return NextResponse.json({
            runtimeDistribution,
            memoryDistribution,
            totalSubmissions: submissions.length,
            userStats: userTime !== null ? {
                runtime: {
                    value: userTime,
                    percentile: runtimePercentile
                },
                memory: {
                    value: userMemory,
                    percentile: memoryPercentile
                }
            } : null
        }, {
            headers: {
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
