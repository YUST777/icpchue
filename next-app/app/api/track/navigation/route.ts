import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/track/navigation
 * Records page visits and session activity.
 * Body: { page, referrer, sessionId, timeSpent?, leftPage? }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });

        const rl = await rateLimit(`nav:${user.id}`, 60, 60);
        if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

        const contentType = req.headers.get('content-type') || '';
        let body;
        if (contentType.includes('application/json')) {
            body = await req.json();
        } else {
            body = JSON.parse(await req.text());
        }

        const { page, referrer, sessionId, timeSpent, leftPage } = body;
        if (!page) return NextResponse.json({ ok: false }, { status: 400 });

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const ua = req.headers.get('user-agent') || null;

        // Determine page type from path
        const pageType = getPageType(page);

        if (leftPage) {
            // User left a page — update the time_spent on the last navigation entry
            await query(
                `UPDATE page_navigation SET left_at = NOW(), time_spent_ms = $1 
                 WHERE user_id = $2 AND session_id = $3 AND page_path = $4 AND left_at IS NULL
                 ORDER BY entered_at DESC LIMIT 1`,
                [timeSpent || 0, user.id, sessionId || '', page]
            ).catch(() => {});
        } else {
            // New page visit
            await query(
                `INSERT INTO page_navigation (user_id, session_id, page_path, referrer, page_type)
                 VALUES ($1, $2, $3, $4, $5)`,
                [user.id, sessionId || '', page, referrer || null, pageType]
            ).catch(() => {});
        }

        // Upsert session
        if (sessionId) {
            const deviceInfo = parseUserAgent(ua);
            await query(
                `INSERT INTO user_sessions (user_id, session_id, ip_address, user_agent, device_type, browser, os, pages_visited, total_events)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1)
                 ON CONFLICT (user_id, session_id) DO UPDATE SET
                    last_seen_at = NOW(),
                    pages_visited = user_sessions.pages_visited + CASE WHEN $8 THEN 1 ELSE 0 END,
                    total_events = user_sessions.total_events + 1`,
                [user.id, sessionId, ip, ua, deviceInfo.device, deviceInfo.browser, deviceInfo.os, !leftPage]
            ).catch(() => {});
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

function getPageType(path: string): string {
    if (path === '/dashboard' || path === '/dashboard/') return 'dashboard';
    if (path.startsWith('/dashboard/sheets/') && path.split('/').length > 5) return 'problem';
    if (path.startsWith('/dashboard/sheets')) return 'sheets';
    if (path.startsWith('/dashboard/leaderboard')) return 'leaderboard';
    if (path.startsWith('/dashboard/profile')) return 'profile';
    if (path.startsWith('/dashboard/settings')) return 'settings';
    if (path.startsWith('/dashboard/achievements')) return 'achievements';
    if (path.startsWith('/dashboard/sessions')) return 'sessions';
    if (path.startsWith('/dashboard/news')) return 'news';
    if (path.startsWith('/dashboard/roadmap')) return 'roadmap';
    if (path.startsWith('/dashboard/admin')) return 'admin';
    return 'other';
}

function parseUserAgent(ua: string | null): { device: string; browser: string; os: string } {
    if (!ua) return { device: 'unknown', browser: 'unknown', os: 'unknown' };
    
    // Device
    let device = 'desktop';
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';

    // Browser
    let browser = 'other';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    // OS
    let os = 'other';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { device, browser, os };
}
