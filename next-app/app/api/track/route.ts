import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { pushEvent } from '@/lib/services/track-buffer';

const VALID_ACTIONS = new Set([
    // Core UI actions
    'problem_view', 'tab_switch', 'code_run', 'code_submit',
    'submission_view', 'solution_view', 'notes_open', 'notes_save',
    'whiteboard_open', 'settings_open', 'language_change',
    'drawer_open', 'handle_save', 'code_copy', 'code_paste',
    'fullscreen_toggle', 'keyboard_shortcut', 'analytics_view',
    'test_add', 'test_delete', 'export_snippet', 'page_leave',
    // Behavior / cheating detection
    'tab_hidden', 'tab_visible', 'window_blur', 'window_focus',
    'text_copy', 'user_idle', 'heartbeat', 'problem_leave',
    'context_menu',
    // New: enhanced tracking
    'scroll_depth', 'code_change', 'editor_selection',
    'resize_window', 'mouse_idle_zone', 'error_encounter',
    'submission_result', 'test_result', 'code_restore',
    'whiteboard_draw', 'solution_video_play', 'solution_video_seek',
    'devtools_open', 'print_attempt',
]);

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });

        // 120 events/min — higher limit since heartbeats + behavior events are frequent
        const rl = await rateLimit(`track:${user.id}`, 120, 60);
        if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

        // Handle both JSON and sendBeacon (text/plain) content types
        let body;
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            body = await req.json();
        } else {
            const text = await req.text();
            body = JSON.parse(text);
        }

        const { action, contestId, problemId, sheetId, metadata, sessionId } = body;

        if (!action || !VALID_ACTIONS.has(action)) {
            return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const ua = req.headers.get('user-agent') || null;

        // Push to Redis buffer — non-blocking, batched flush to Postgres
        pushEvent({
            user_id: user.id,
            session_id: sessionId || '',
            action,
            contest_id: contestId || null,
            problem_id: problemId || null,
            sheet_id: sheetId || null,
            metadata: JSON.stringify(metadata || {}),
            ip_address: ip,
            user_agent: ua,
            created_at: new Date().toISOString(),
        }).catch(() => {});

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
