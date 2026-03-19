import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/video/rate?contestId=...&problemId=...
 * Returns the total like/dislike counts and the current user's rating.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const contestId = searchParams.get('contestId');
        const problemId = searchParams.get('problemId');

        if (!contestId || !problemId) {
            return NextResponse.json({ error: 'Missing contestId or problemId' }, { status: 400 });
        }

        const user = await verifyAuth(req);

        // Get aggregate stats
        const statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE rating = 1) as likes,
                COUNT(*) FILTER (WHERE rating = -1) as dislikes
            FROM video_ratings
            WHERE contest_id = $1 AND problem_id = $2
        `;
        const statsResult = await query(statsQuery, [contestId, problemId]);
        const stats = statsResult.rows[0];

        // Get current user's rating if logged in
        let userRating = 0;
        if (user) {
            const userRatingQuery = `
                SELECT rating FROM video_ratings 
                WHERE contest_id = $1 AND problem_id = $2 AND user_id = $3
            `;
            const userRatingResult = await query(userRatingQuery, [contestId, problemId, user.id]);
            if (userRatingResult.rows.length > 0) {
                userRating = userRatingResult.rows[0].rating;
            }
        }

        return NextResponse.json({
            likes: parseInt(stats.likes) || 0,
            dislikes: parseInt(stats.dislikes) || 0,
            userRating
        });

    } catch (error: any) {
        console.error('[VideoRate API GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/video/rate
 * Body: { contestId, problemId, rating }
 * Records or updates a user rating (1 for like, -1 for dislike, 0 to remove).
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contestId, problemId, rating } = await req.json();

        if (!contestId || !problemId || rating === undefined) {
            return NextResponse.json({ error: 'Missing contestId, problemId or rating' }, { status: 400 });
        }

        if (![1, 0, -1].includes(rating)) {
            return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
        }

        if (rating === 0) {
            // Delete the rating
            await query(
                'DELETE FROM video_ratings WHERE contest_id = $1 AND problem_id = $2 AND user_id = $3',
                [contestId, problemId, user.id]
            );
        } else {
            // Upsert the rating
            const upsertQuery = `
                INSERT INTO video_ratings (contest_id, problem_id, user_id, rating, updated_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (user_id, contest_id, problem_id)
                DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
            `;
            await query(upsertQuery, [contestId, problemId, user.id, rating]);
        }

        // Return updated stats
        const statsQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE rating = 1) as likes,
                COUNT(*) FILTER (WHERE rating = -1) as dislikes
            FROM video_ratings
            WHERE contest_id = $1 AND problem_id = $2
        `;
        const statsResult = await query(statsQuery, [contestId, problemId]);
        const stats = statsResult.rows[0];

        return NextResponse.json({
            success: true,
            likes: parseInt(stats.likes) || 0,
            dislikes: parseInt(stats.dislikes) || 0,
            userRating: rating
        });

    } catch (error: any) {
        console.error('[VideoRate API POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
