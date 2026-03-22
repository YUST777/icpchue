import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const WINDOW_SIZE = 60 * 1000;
const MAX_REQUESTS_PAGE = 500;
const MAX_REQUESTS_API = 120;
const MAX_REQUESTS_SENSITIVE = 15;

const SENSITIVE_PREFIXES = [
    '/api/judge/',
    '/api/analyze-complexity',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/check-email',
    '/api/auth/send-otp',
    '/api/auth/verify-otp',
    '/api/user/upload-pfp',
    '/api/user/delete-profile-data',
];

setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 60000);

export async function middleware(request: NextRequest) {
    // --- Supabase Session Refresh ---
    // This must happen before creating the response so cookies propagate correctly
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session for protected pages AND API routes to prevent 401 on /api/auth/me etc.
    const urlPath = request.nextUrl.pathname;
    const isProtectedRoute = urlPath.startsWith('/dashboard') || urlPath.startsWith('/admin') || urlPath.startsWith('/profile');
    const isApiRoute = urlPath.startsWith('/api/');
    
    if (isProtectedRoute || isApiRoute) {
        await supabase.auth.getUser();
    }

    const headers = supabaseResponse.headers;

    // --- 1. Security Headers ---
    headers.set('X-DNS-Prefetch-Control', 'on');
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'origin-when-cross-origin');

    const isDev = process.env.NODE_ENV === 'development';
    const scriptSrc = isDev 
        ? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https: blob:" 
        : "'self' 'unsafe-inline' 'wasm-unsafe-eval' https: blob:";

    headers.set('Content-Security-Policy', `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: blob:; media-src 'self' https: data: blob:; frame-src 'self' https://drive.google.com https://www.youtube.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;`);

    // --- 2. Bot Blocking ---
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const allowedBots = ['googlebot', 'bingbot', 'applebot', 'yandexbot', 'duckduckbot', 'baiduspider', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'slackbot'];
    const isLegitimateBot = allowedBots.some(bot => userAgent.includes(bot));
    const blockedAgents = ['python-requests', 'libwww-perl', 'scrapy'];

    if (!isLegitimateBot && blockedAgents.some(agent => userAgent.includes(agent))) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    // --- 3. Rate Limiting (covers all routes including /api/) ---
    const url = request.nextUrl.pathname;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    if (ip !== 'unknown') {
        const isSensitive = SENSITIVE_PREFIXES.some(p => url.startsWith(p));
        const isApi = url.startsWith('/api/');
        const maxRequests = isSensitive ? MAX_REQUESTS_SENSITIVE : isApi ? MAX_REQUESTS_API : MAX_REQUESTS_PAGE;
        const rateLimitKey = isSensitive ? `${ip}:sensitive` : isApi ? `${ip}:api` : ip;

        const now = Date.now();
        const limitData = rateLimitMap.get(rateLimitKey);

        if (limitData) {
            if (now < limitData.resetTime) {
                if (limitData.count >= maxRequests) {
                    return new NextResponse('Too Many Requests', { status: 429 });
                }
                limitData.count++;
            } else {
                rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + WINDOW_SIZE });
            }
        } else {
            rateLimitMap.set(rateLimitKey, { count: 1, resetTime: now + WINDOW_SIZE });
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.webp|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.glb|.*\\.mp4|.*\\.webm).*)'],
};
