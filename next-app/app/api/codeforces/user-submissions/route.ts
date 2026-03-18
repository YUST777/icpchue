import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/simple-rate-limit';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface CFUserSubmission {
    id: number;
    contestId?: number;
    creationTimeSeconds: number;
    verdict?: string;
    timeConsumedMillis?: number;
    memoryConsumedBytes?: number;
    programmingLanguage?: string;
    problem?: { index?: string };
    passedTestCount?: number;
}

/**
 * Fetch user's own submissions for a specific problem from Codeforces.
 * Uses the user.status API filtered by contest and problem index.
 * 
 * Query params:
 *   - handle: Codeforces user handle (required)
 *   - contestId: Contest ID (required) 
 *   - problemIndex: Problem index like "A", "B", etc (optional, filters results)
 */
export async function GET(request: NextRequest) {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`user-submissions:${ip}`, 20, 60)) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');
    const contestId = searchParams.get('contestId');
    const problemIndex = searchParams.get('problemIndex');

    if (!handle) {
        return NextResponse.json({ error: 'Missing handle parameter' }, { status: 400 });
    }

    if (!contestId) {
        return NextResponse.json({ error: 'Missing contestId parameter' }, { status: 400 });
    }

    try {
        // Use Redis cache to prevent dog-piling Codeforces API
        const cacheKey = `cf:user-status:${handle}`;
        const TTL = 300; // 5 minutes cache for user status (sync)

        const submissions = await getCachedData<any[]>(cacheKey, TTL, async () => {
            // Fetch fewer submissions to be faster. 200 is plenty for recent solves.
            const apiUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=200`;

            const response = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Verdict/1.0 (Competitive Programming Tool)',
                    'Accept': 'application/json'
                },
                next: { revalidate: 300 }
            });

            if (!response.ok) {
                // Return empty if CF is down to avoid crashing the whole page
                console.error(`CF API error: ${response.status}`);
                return [];
            }

            const data = await response.json();
            if (data.status !== 'OK' || !Array.isArray(data.result)) {
                return [];
            }

            return data.result;
        });

        // Filter submissions by contestId and optionally by problemIndex
        const normalizedContestId = contestId.toString();
        let userSubmissions = (submissions as CFUserSubmission[]).filter((sub) => {
            const subContestId = sub.contestId?.toString();
            return subContestId === normalizedContestId;
        });

        if (problemIndex) {
            const normalizedProblemIndex = problemIndex.toUpperCase().trim();
            userSubmissions = userSubmissions.filter((sub) => {
                const subIndex = sub.problem?.index?.toUpperCase().trim();
                return subIndex === normalizedProblemIndex;
            });
        }

        // Sort by creation time (newest first)
        userSubmissions.sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds);

        // Map to clean format
        const cleanSubmissions = userSubmissions.map((sub) => ({
            id: sub.id,
            creationTimeSeconds: sub.creationTimeSeconds,
            verdict: sub.verdict === 'OK' ? 'Accepted' : sub.verdict,
            timeConsumedMillis: sub.timeConsumedMillis,
            memoryConsumedBytes: sub.memoryConsumedBytes,
            language: sub.programmingLanguage,
            problemIndex: sub.problem?.index,
            passedTestCount: sub.passedTestCount
        }));

        return NextResponse.json({
            success: true,
            handle,
            contestId,
            problemIndex,
            submissions: cleanSubmissions
        });

    } catch (error) {
        return NextResponse.json({
            error: 'Failed to fetch user submissions'
        }, { status: 500 });
    }
}
