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
    const urlType = searchParams.get('urlType') || 'contest';
    const groupId = searchParams.get('groupId');

    if (!contestId) {
        return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
    }

    // Phase 1: Try official Codeforces Public API
    if (API_KEY && API_SECRET && urlType === 'contest') {
        try {
            const result = await cfApiCall('contest.status', {
                contestId,
                from: 1,
                count: 50
            });

            if (result.status === 'OK' && result.result.length > 0) {
                let submissions = result.result;
                if (problemIndex) {
                    submissions = submissions.filter((s: any) => s.problem.index === problemIndex);
                }

                return NextResponse.json(submissions.map((s: any) => ({
                    id: s.id,
                    creationTimeSeconds: s.creationTimeSeconds,
                    author: s.author.members.map((m: any) => m.handle).join(', '),
                    verdict: s.verdict,
                    timeConsumedMillis: s.timeConsumedMillis,
                    memoryConsumedBytes: s.memoryConsumedBytes,
                    language: s.programmingLanguage
                })));
            }
        } catch (e) {
            console.warn('[Submissions API] Public API failed, falling back to bridge...', e);
        }
    }

    // Phase 2: Fallback to Scrapling Bridge (Scraping via user's session)
    try {
        const SCRAPLING_BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://localhost:8787';
        
        // We need cookies for the bridge to work for private/group contests
        const cookies = req.headers.get('cookie') || '';

        const bridgeRes = await fetch(`${SCRAPLING_BRIDGE_URL}/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contestId,
                problemIndex,
                cookies,
                urlType,
                groupId
            })
        });

        if (bridgeRes.ok) {
            const data = await bridgeRes.json();
            if (data.success) {
                return NextResponse.json(data.submissions);
            }
        }
    } catch (error) {
        console.error('[Submissions API] Bridge fallback failed:', error);
    }

    // Final Graceful Fallback
    return NextResponse.json([]);
}
