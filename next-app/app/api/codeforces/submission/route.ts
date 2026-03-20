import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
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
    const cookies = searchParams.get('cookies');
    const urlType = searchParams.get('urlType') || 'contest';
    const groupId = searchParams.get('groupId');

    if (!contestId || !submissionId) {
        return NextResponse.json({ error: 'Missing contestId or submissionId' }, { status: 400 });
    }

    // Auth & Rate Limit: 30 per 60s per user (polling needs to be frequent but limited)
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ratelimit = await rateLimit(`cf_status_view:${user.id}`, 30, 60);
    if (!ratelimit.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        let result;
        const isRestricted = urlType === 'group' || urlType === 'gym';

        // 1. For Restricted contests (Group/Gym), use the Bridge FIRST
        if (isRestricted && cookies) {
            try {
                const SCRAPLING_BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://localhost:8787';
                const bridgeRes = await fetch(`${SCRAPLING_BRIDGE_URL}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ submissionId, contestId, cookies, urlType, groupId })
                });

                if (bridgeRes.ok) {
                    const bridgeData = await bridgeRes.json();
                    if (bridgeData.success && bridgeData.verdict) {
                        return NextResponse.json({
                            success: true,
                            verdict: bridgeData.verdict,
                            testNumber: bridgeData.testNumber || 0,
                            time: bridgeData.time || 0,
                            memory: bridgeData.memory || 0,
                            compilationError: bridgeData.compilationError || null,
                            details: bridgeData.details || null,
                            waiting: !bridgeData.verdict || 
                                     ['queue', 'testing'].some(s => bridgeData.verdict.toLowerCase().includes(s))
                        });
                    }
                }
            } catch (err: any) {
                console.warn('[Bridge Status Fallback] Error:', err.message);
            }
        }

        // 2. Try official APIs (faster for public contests)
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

        // 3. Fallback to Bridge for public contests if official APIs failed to find it
        if (!isRestricted && cookies) {
            try {
                const SCRAPLING_BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://localhost:8787';
                const bridgeRes = await fetch(`${SCRAPLING_BRIDGE_URL}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ submissionId, contestId, cookies, urlType, groupId })
                });

                if (bridgeRes.ok) {
                    const bridgeData = await bridgeRes.json();
                    if (bridgeData.success && bridgeData.verdict) {
                        return NextResponse.json({
                            success: true,
                            verdict: bridgeData.verdict,
                            testNumber: bridgeData.testNumber || 0,
                            time: bridgeData.time || 0,
                            memory: bridgeData.memory || 0,
                            compilationError: bridgeData.compilationError || null,
                            details: bridgeData.details || null,
                            waiting: !bridgeData.verdict || 
                                     ['queue', 'testing'].some(s => bridgeData.verdict.toLowerCase().includes(s))
                        });
                    }
                }
            } catch (err: any) {
                console.warn('[Bridge Status] Fallback error:', err.message);
            }
        }

        // If we found nothing but polling still makes sense
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
