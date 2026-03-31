import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import crypto from 'crypto';

const API_KEY = process.env.CF_API_KEY;
const API_SECRET = process.env.CF_API_SECRET;
const BRIDGE_URL = process.env.SCRAPLING_BRIDGE_URL || 'http://scrapling-bridge:8787';

// ── Server-side status cache ────────────────────────────────────────
// Prevents hammering CF API when frontend polls every 2-3s
const statusCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const CACHE_TTL_PENDING = 2000;
const CACHE_TTL_FINAL = 60000;

function isFinalVerdict(verdict: string | null): boolean {
    if (!verdict) return false;
    const v = verdict.toUpperCase();
    return !['TESTING', 'RUNNING', ''].includes(v) &&
           !v.includes('QUEUE') && !v.includes('WAITING');
}

// Clean up old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of statusCache) {
        if (now - val.ts > CACHE_TTL_FINAL) statusCache.delete(key);
    }
}, 30000);

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
    // Rate limit: CF allows 1 API call per 2 seconds
    const now = Date.now();
    if (now - lastCfApiCall < 2100) {
        return { status: 'FAILED', comment: 'Rate limited (internal)' };
    }
    lastCfApiCall = now;

    const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `https://codeforces.com/api/${method}?${queryStr}`;

    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e: any) {
        return { status: 'FAILED', comment: e.message };
    }
}

let lastCfApiCall = 0;

// Support both GET (legacy) and POST (cookies in body, not URL)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    return handleSubmissionStatus(req, {
        contestId: searchParams.get('contestId'),
        submissionId: searchParams.get('submissionId'),
        handle: searchParams.get('handle'),
        cookies: searchParams.get('cookies'),
        urlType: searchParams.get('urlType') || 'contest',
        groupId: searchParams.get('groupId'),
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    return handleSubmissionStatus(req, {
        contestId: body.contestId,
        submissionId: String(body.submissionId),
        handle: body.handle || null,
        cookies: body.cookies || null,
        urlType: body.urlType || 'contest',
        groupId: body.groupId || null,
    });
}

async function handleSubmissionStatus(req: NextRequest, params: {
    contestId: string | null;
    submissionId: string | null;
    handle: string | null;
    cookies: string | null;
    urlType: string;
    groupId: string | null;
}) {
    const { contestId, submissionId, handle, cookies, urlType, groupId } = params;

    if (!contestId || !submissionId) {
        return NextResponse.json({ error: 'Missing contestId or submissionId' }, { status: 400 });
    }

    // Auth & Rate Limit: 120 per 60s per user (verdict polling hits this every 1-2s)
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ratelimit = await rateLimit(`cf_status_view:${user.id}`, 120, 60);
    if (!ratelimit.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        // ── Check server-side cache first ──
        const cacheKey = `${contestId}:${submissionId}`;
        const cached = statusCache.get(cacheKey);
        if (cached) {
            const age = Date.now() - cached.ts;
            const ttl = isFinalVerdict(cached.data.verdict as string | null) ? CACHE_TTL_FINAL : CACHE_TTL_PENDING;
            if (age < ttl) {
                return NextResponse.json(cached.data);
            }
        }

        let result;
        const isRestricted = urlType === 'group' || urlType === 'gym';

        // 1. For Restricted contests (Group/Gym), use the Bridge FIRST
        if (isRestricted && cookies) {
            try {
                const bridgeRes = await fetch(`${BRIDGE_URL}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ submissionId, contestId, cookies, urlType, groupId })
                });

                if (bridgeRes.ok) {
                    const bridgeData = await bridgeRes.json();
                    if (bridgeData.success && bridgeData.verdict) {
                        const response = {
                            success: true,
                            verdict: bridgeData.verdict,
                            testNumber: bridgeData.testNumber || 0,
                            time: bridgeData.time || 0,
                            memory: bridgeData.memory || 0,
                            compilationError: bridgeData.compilationError || null,
                            details: bridgeData.details || null,
                            waiting: !bridgeData.verdict || 
                                     ['queue', 'testing'].some(s => bridgeData.verdict.toLowerCase().includes(s))
                        };
                        statusCache.set(cacheKey, { data: response, ts: Date.now() });
                        return NextResponse.json(response);
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
                    const response = {
                        success: true,
                        verdict: sub.verdict || null,
                        testNumber: sub.passedTestCount,
                        time: sub.timeConsumedMillis,
                        memory: Math.round(sub.memoryConsumedBytes / 1024),
                        waiting: !sub.verdict || sub.verdict === 'TESTING'
                    };
                    statusCache.set(cacheKey, { data: response, ts: Date.now() });
                    return NextResponse.json(response);
                }
            }
        }

        if (API_KEY && API_SECRET) {
            result = await cfApiCall('contest.status', { contestId, from: 1, count: 50 });
            if (result.status === 'OK') {
                const sub = result.result.find((s: any) => s.id === parseInt(submissionId));
                if (sub) {
                    const response = {
                        success: true,
                        verdict: sub.verdict || null,
                        testNumber: sub.passedTestCount,
                        time: sub.timeConsumedMillis,
                        memory: Math.round(sub.memoryConsumedBytes / 1024),
                        waiting: !sub.verdict || sub.verdict === 'TESTING'
                    };
                    statusCache.set(cacheKey, { data: response, ts: Date.now() });
                    return NextResponse.json(response);
                }
            }
        }

        // 3. Fallback to Bridge for public contests if official APIs failed to find it
        if (!isRestricted && cookies) {
            try {
                const bridgeRes = await fetch(`${BRIDGE_URL}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ submissionId, contestId, cookies, urlType, groupId })
                });

                if (bridgeRes.ok) {
                    const bridgeData = await bridgeRes.json();
                    if (bridgeData.success && bridgeData.verdict) {
                        const response = {
                            success: true,
                            verdict: bridgeData.verdict,
                            testNumber: bridgeData.testNumber || 0,
                            time: bridgeData.time || 0,
                            memory: bridgeData.memory || 0,
                            compilationError: bridgeData.compilationError || null,
                            details: bridgeData.details || null,
                            waiting: !bridgeData.verdict || 
                                     ['queue', 'testing'].some(s => bridgeData.verdict.toLowerCase().includes(s))
                        };
                        statusCache.set(cacheKey, { data: response, ts: Date.now() });
                        return NextResponse.json(response);
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
        console.error('[CF Submission Status] Error:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
