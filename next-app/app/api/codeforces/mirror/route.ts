import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/cache/simple-rate-limit';
import { getCachedData } from '@/lib/cache/cache';

export async function GET(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';
    if (!checkRateLimit(`mirror:${ip}`, 20, 60)) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const contestId = searchParams.get('contestId');
    const problemId = searchParams.get('problemId');
    const urlType = searchParams.get('type') || 'contest';
    const groupId = searchParams.get('groupId');

    if (!contestId || !problemId) {
        return NextResponse.json({ error: 'Missing contestId or problemId' }, { status: 400 });
    }

    // 1. Try Redis cache first, then DB (curriculum_problems.content)
    try {
        const cacheKey = `mirror:${contestId}:${problemId.toUpperCase()}`;
        const cached = await getCachedData(cacheKey, 3600, async () => {
            const curriculumResult = await query(
                `SELECT cp.content, cp.codeforces_url
                 FROM curriculum_problems cp
                 JOIN curriculum_sheets cs ON cp.sheet_id = cs.id
                 WHERE cs.contest_id = $1 AND cp.problem_letter = $2`,
                [contestId, problemId.toUpperCase()]
            );

            if (curriculumResult.rows.length > 0 && curriculumResult.rows[0].content) {
                const content = curriculumResult.rows[0].content;
                const codeforcesUrl = curriculumResult.rows[0].codeforces_url;
                if (typeof content === 'object' && content !== null) {
                    (content as any).codeforcesUrl = codeforcesUrl;
                }
                return content;
            }
            return null;
        });

        if (cached) {
            return NextResponse.json(cached);
        }
    } catch (dbErr) {
        console.error('[Mirror] Curriculum lookup failed:', dbErr);
    }

    // Build the correct URL based on type
    let targetUrl: string;
    switch (urlType) {
        case 'gym':
            targetUrl = `https://codeforces.com/gym/${contestId}/problem/${problemId}`;
            break;
        case 'problemset':
            targetUrl = `https://codeforces.com/problemset/problem/${contestId}/${problemId}`;
            break;
        case 'acmsguru':
            targetUrl = `https://codeforces.com/problemsets/acmsguru/problem/99999/${problemId}`;
            break;
        case 'group':
            if (!groupId) {
                return NextResponse.json({ error: 'Missing groupId for group problem' }, { status: 400 });
            }
            targetUrl = `https://codeforces.com/group/${groupId}/contest/${contestId}/problem/${problemId}`;
            break;
        case 'contest':
        default:
            targetUrl = `https://codeforces.com/contest/${contestId}/problem/${problemId}`;
            break;
    }

    // Call the host mirror service (runs puppeteer outside Docker)
    // The service runs on the host at port 3099
    // In production, set MIRROR_SERVICE_URL env variable (e.g., http://mirror-service:3099)
    const mirrorServiceUrl = process.env.MIRROR_SERVICE_URL || 'http://localhost:3099';

    try {
        const response = await fetch(`${mirrorServiceUrl}/fetch?url=${encodeURIComponent(targetUrl)}`, {
            signal: AbortSignal.timeout(120000) // 2 minute timeout
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json({ error: 'Mirror service error', detail: errData.error || 'Unknown error' }, { status: 500 });
        }

        const data = await response.json();

        if (data.error) {
            return NextResponse.json({ error: data.error, detail: data.detail }, { status: 500 });
        }





        return NextResponse.json(data);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch from Codeforces Mirror', detail: message }, { status: 500 });
    }
}

