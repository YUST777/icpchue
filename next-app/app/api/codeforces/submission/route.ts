import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const API_KEY = process.env.CF_API_KEY;
const API_SECRET = process.env.CF_API_SECRET;

async function cfApiCall(method: string, params: Record<string, any> = {}) {
    if (!API_KEY || !API_SECRET) return { status: 'FAILED', comment: 'Keys not configured' };

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

async function cfPublicApiCall(method: string, params: Record<string, string> = {}) {
    const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `https://codeforces.com/api/${method}?${queryStr}`;

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
    const submissionId = searchParams.get('submissionId');
    const handle = searchParams.get('handle');

    if (!contestId || !submissionId) {
        return NextResponse.json({ error: 'Missing contestId or submissionId' }, { status: 400 });
    }

    try {
        let result;

        // 1. Try public user.status if handle is provided (works for most contests, including group ones if public)
        if (handle) {
            result = await cfPublicApiCall('user.status', { handle, from: '1', count: '15' });
            if (result.status === 'OK') {
                const sub = result.result.find((s: any) => s.id === parseInt(submissionId));
                if (sub) {
                    return NextResponse.json({
                        success: true,
                        verdict: sub.verdict || null,
                        testNumber: sub.passedTestCount,
                        time: sub.timeConsumedMillis,
                        memory: Math.round(sub.memoryConsumedBytes / 1024),
                        waiting: !sub.verdict || sub.verdict === 'TESTING'
                    });
                }
            }
        }

        // 2. Fallback to authenticated contest.status if API keys exist
        if (API_KEY && API_SECRET) {
            result = await cfApiCall('contest.status', { contestId, from: 1, count: 15 });
            if (result.status === 'OK') {
                const sub = result.result.find((s: any) => s.id === parseInt(submissionId));
                if (sub) {
                    return NextResponse.json({
                        success: true,
                        verdict: sub.verdict || null,
                        testNumber: sub.passedTestCount,
                        time: sub.timeConsumedMillis,
                        memory: Math.round(sub.memoryConsumedBytes / 1024),
                        waiting: !sub.verdict || sub.verdict === 'TESTING'
                    });
                }
            }
        }

        // If we found nothing but polling still makes sense (e.g. status returned OK but sub not there yet)
        return NextResponse.json({
            success: true,
            waiting: true,
            verdict: null,
            message: 'Submission still propagating or not found'
        });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
