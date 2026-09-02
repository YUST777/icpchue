import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';
import { createBlindIndex } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id?: string }> }) {
    try {
        const params = await props.params;
        const studentId = params?.id;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
        }
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(studentId)) {
            return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
        }

        // Rate limit: 10 per 60s per IP
        const ip = getClientIp(req);
        const ratelimit = await rateLimit(`recap_view:${ip}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Recaps are shareable, but a member who disabled public visibility
        // must not remain discoverable through this separate snapshot table.
        const visibility = await query(`
            SELECT u.profile_visibility, u.show_public_profile
            FROM applications a
            JOIN users u ON u.application_id = a.id
            WHERE a.student_id = $1 OR a.student_id_blind_index = $2
            LIMIT 1
        `, [studentId, createBlindIndex(studentId)]);
        if (visibility.rows[0] &&
            (visibility.rows[0].profile_visibility === 'private' || visibility.rows[0].show_public_profile === false)) {
            return NextResponse.json({ error: 'This recap is private' }, { status: 403 });
        }

        // Read from pre-calculated recap_2025 table
        const recapRes = await query(`
            SELECT 
                student_id,
                username,
                avatar_url,
                days_active,
                total_solved,
                total_submissions,
                top_problem,
                top_problem_attempts,
                rank_percentile,
                max_streak,
                preferred_language,
                top_tags,
                difficulty_solved,
                achievements,
                time_spent_minutes
            FROM recap_2025 
            WHERE student_id = $1
            LIMIT 1
        `, [studentId]);

        if (recapRes.rows.length === 0) {
            return NextResponse.json({ error: 'Recap not found for this user' }, { status: 404 });
        }

        const recap = recapRes.rows[0];

        // Return the pre-calculated data
        return NextResponse.json({
            username: recap.username,
            avatarUrl: recap.avatar_url,
            daysActive: recap.days_active,
            totalSolved: recap.total_solved,
            totalSubmissions: recap.total_submissions,
            topProblem: recap.top_problem,
            topProblemAttempts: recap.top_problem_attempts,
            rankPercentile: recap.rank_percentile,
            maxStreak: recap.max_streak,
            preferredLanguage: recap.preferred_language,
            topTags: recap.top_tags || [],
            difficultySolved: recap.difficulty_solved || { easy: 0, medium: 0, hard: 0 },
            achievements: recap.achievements || [],
            timeSpentMinutes: recap.time_spent_minutes || 0
        });

    } catch (error: unknown) {
        console.error('[Recap API] Error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
