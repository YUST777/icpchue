import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { query } from '@/lib/db/db';

// The client flushes every ~20s; allow slack for throttled background tabs.
const MAX_SECONDS_PER_BEAT = 120;
const MAX_VIDEO_SECONDS = 6 * 3600;
const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const VIDEO_ID_RE = /^[\w-]{6,64}$/;

function clampInt(value: unknown, max: number): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

function intList(value: unknown, max: number, limit: number): number[] {
    if (!Array.isArray(value)) return [];
    const out = new Set<number>();
    for (const v of value.slice(0, limit)) {
        const n = Math.floor(Number(v));
        if (Number.isFinite(n) && n >= 0 && n <= max) out.add(n);
    }
    return [...out];
}

/**
 * Adds a session-page heartbeat: video watch time, the 10s parts of the
 * video that were played, page time and slides opened. Watched and page
 * seconds can never exceed the wall-clock time since the previous beat.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });

        const rl = await rateLimit(`track-session-watch:${user.id}`, 20, 60);
        if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

        // sendBeacon posts text/plain.
        const body = JSON.parse((await req.text()) || '{}');
        const campSlug = String(body.campSlug || '');
        const sessionSlug = String(body.sessionSlug || '');
        const videoId = body.videoId ? String(body.videoId) : null;
        if (!SLUG_RE.test(campSlug) || !SLUG_RE.test(sessionSlug) || (videoId && !VIDEO_ID_RE.test(videoId))) {
            return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 400 });
        }

        const watched = clampInt(body.watched, MAX_SECONDS_PER_BEAT);
        const pageSeconds = clampInt(body.pageSeconds, MAX_SECONDS_PER_BEAT);
        const plays = clampInt(body.plays, 20);
        const duration = clampInt(body.duration, MAX_VIDEO_SECONDS) || null;
        const position = clampInt(body.position, MAX_VIDEO_SECONDS);
        const buckets = intList(body.buckets, Math.ceil(MAX_VIDEO_SECONDS / 10), 200);
        const slides = intList(body.slides, 500, 100);
        if (watched + pageSeconds + plays + buckets.length + slides.length === 0 && !position) {
            return NextResponse.json({ ok: true });
        }

        await query(
            `INSERT INTO session_watch
                (user_id, camp_slug, session_slug, video_id, watched_seconds, page_seconds, duration_seconds,
                 max_position_seconds, watched_buckets, slides_seen, plays)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::int[], $10::int[], $11)
             ON CONFLICT (user_id, camp_slug, session_slug) DO UPDATE SET
                watched_seconds = session_watch.watched_seconds + LEAST(
                    EXCLUDED.watched_seconds,
                    GREATEST(0, EXTRACT(EPOCH FROM now() - session_watch.last_beat_at))::int + 5
                ),
                page_seconds = session_watch.page_seconds + LEAST(
                    EXCLUDED.page_seconds,
                    GREATEST(0, EXTRACT(EPOCH FROM now() - session_watch.last_beat_at))::int + 5
                ),
                video_id = COALESCE(EXCLUDED.video_id, session_watch.video_id),
                duration_seconds = COALESCE(EXCLUDED.duration_seconds, session_watch.duration_seconds),
                max_position_seconds = GREATEST(session_watch.max_position_seconds, EXCLUDED.max_position_seconds),
                watched_buckets = ARRAY(SELECT DISTINCT b FROM unnest(session_watch.watched_buckets || EXCLUDED.watched_buckets) AS b ORDER BY b),
                slides_seen = ARRAY(SELECT DISTINCT s FROM unnest(session_watch.slides_seen || EXCLUDED.slides_seen) AS s ORDER BY s),
                plays = session_watch.plays + EXCLUDED.plays,
                last_beat_at = now()`,
            [user.id, campSlug, sessionSlug, videoId, watched, pageSeconds, duration, position, buckets, slides, plays]
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Track Session Watch] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
