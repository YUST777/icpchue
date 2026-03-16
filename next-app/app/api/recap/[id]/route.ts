import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id?: string }> }) {
    try {
        const params = await props.params;
        const studentId = params?.id;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
    }
}
