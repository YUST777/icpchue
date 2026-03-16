import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const API_KEY = process.env.CF_API_KEY;
const API_SECRET = process.env.CF_API_SECRET;

async function cfApiCall(method: string, params: Record<string, any> = {}) {
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).substring(2, 8);

    // Add required params
    params.apiKey = API_KEY;
    params.time = time;

    // Sort keys and build query string
    const sortedKeys = Object.keys(params).sort();
    const queryStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');

    // Build signature
    const signatureBase = `${rand}/${method}?${queryStr}#${API_SECRET}`;
    const hash = crypto.createHash('sha512').update(signatureBase).digest('hex');
    const apiSig = rand + hash;

    const url = `https://codeforces.com/api/${method}?${queryStr}&apiSig=${apiSig}`;

    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e: any) {
        return { status: 'FAILED', comment: e.message };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const contestId = searchParams.get('contestId');
    const problemIndex = searchParams.get('problemIndex');

    if (!contestId) {
        return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
    }

    if (!API_KEY || !API_SECRET) {
        return NextResponse.json({ error: 'Codeforces API keys not configured' }, { status: 503 });
    }

    try {
        const result = await cfApiCall('contest.status', {
            contestId,
            from: 1,
            count: 50
        });

        if (result.status !== 'OK') {
            // contest.status doesn't work for group contests — return empty array gracefully
            return NextResponse.json([]);
        }

        let submissions = result.result;

        // Filter by problem if index provided
        if (problemIndex) {
            submissions = submissions.filter((s: any) => s.problem.index === problemIndex);
        }

        // Map to the format expected by SubmissionsList.tsx
        const mappedSubmissions = submissions.map((s: any) => ({
            id: s.id,
            creationTimeSeconds: s.creationTimeSeconds,
            author: s.author.members.map((m: any) => m.handle).join(', '),
            verdict: s.verdict,
            timeConsumedMillis: s.timeConsumedMillis,
            memoryConsumedBytes: s.memoryConsumedBytes,
            language: s.programmingLanguage
        }));

        return NextResponse.json(mappedSubmissions);

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
