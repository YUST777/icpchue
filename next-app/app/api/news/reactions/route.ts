import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { getClientIp } from '@/lib/security/request';

export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);
    // Express used authenticateToken, so we require auth
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult;
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const newsId = searchParams.get('newsId');
    const newsIdsParam = searchParams.get('newsIds');

    if (!newsId && !newsIdsParam) {
        return NextResponse.json({ error: 'newsId or newsIds is required' }, { status: 400 });
    }

    const ids = newsIdsParam ? newsIdsParam.split(',') : [newsId!];
    if (ids.length === 0) return NextResponse.json({});

    const responseMap: Record<string, { counts: { like: number; heart: number; fire: number }; userReactions: string[] }> = {};
    const idsToFetch: string[] = [];

    try {
        ids.forEach(id => {
            responseMap[id] = { counts: { like: 0, heart: 0, fire: 0 }, userReactions: [] };
            idsToFetch.push(id);
        });

        // Fetch Missing from DB
        if (idsToFetch.length > 0) {
            const countsResult = await query(
                `SELECT news_id, reaction_type, COUNT(*) as count 
                 FROM news_reactions 
                 WHERE news_id = ANY($1) 
                 GROUP BY news_id, reaction_type`,
                [idsToFetch]
            );

            const dbCountsMap: Record<string, { like: number; heart: number; fire: number }> = {};
            idsToFetch.forEach(id => dbCountsMap[id] = { like: 0, heart: 0, fire: 0 });

            countsResult.rows.forEach((row: { news_id: string; reaction_type: string; count: string }) => {
                if (dbCountsMap[row.news_id]) {
                    dbCountsMap[row.news_id][row.reaction_type as 'like' | 'heart' | 'fire'] = parseInt(row.count, 10);
                }
            });

            // Update Response & Cache
            idsToFetch.forEach(id => {
                const counts = dbCountsMap[id];
                responseMap[id].counts = counts;
            });

        }

        // User Reactions (Always fetch fresh)
        const userReactionsResult = await query(
            `SELECT news_id, reaction_type FROM news_reactions WHERE news_id = ANY($1) AND user_id = $2`,
            [ids, userId]
        );

        userReactionsResult.rows.forEach((row: { news_id: string; reaction_type: string }) => {
            if (responseMap[row.news_id]) {
                responseMap[row.news_id].userReactions.push(row.reaction_type);
            }
        });

        if (newsId && !newsIdsParam) {
            return NextResponse.json(responseMap[newsId]);
        }
        return NextResponse.json(responseMap);

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult;
    const userId = user.id;

    try {
        const ip = getClientIp(req);
        const limitResult = await rateLimit(`news-react:${userId}`, 10, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many reactions. Please slow down.' }, { status: 429 });
        }

        const body = await req.json();
        const { newsId, reactionType } = body;

        if (!newsId || !reactionType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['like', 'heart', 'fire'].includes(reactionType)) {
            return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
        }


        // Toggle in a single query: delete if exists, insert if not, return action taken
        const toggleResult = await query(`
            WITH deleted AS (
                DELETE FROM news_reactions 
                WHERE news_id = $1 AND user_id = $2 AND reaction_type = $3
                RETURNING id
            ),
            inserted AS (
                INSERT INTO news_reactions (news_id, user_id, reaction_type)
                SELECT $1, $2, $3
                WHERE NOT EXISTS (SELECT 1 FROM deleted)
                RETURNING id
            )
            SELECT
                CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'removed' ELSE 'added' END AS action
        `, [newsId, userId, reactionType]);

        const action = toggleResult.rows[0]?.action || 'added';
        return NextResponse.json({ action, reactionType });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
