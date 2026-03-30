import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { entityType, entityId } = await req.json();

        if (!entityType || !entityId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Single query: log view + conditionally increment counter + return count
        const result = await query(`
            WITH new_view AS (
                INSERT INTO view_logs (user_id, entity_type, entity_id)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING
                RETURNING id
            ),
            upsert_count AS (
                INSERT INTO page_views (entity_type, entity_id, views_count)
                SELECT $2, $3, 1
                FROM new_view
                ON CONFLICT (entity_type, entity_id)
                DO UPDATE SET views_count = page_views.views_count + 1
                RETURNING views_count
            )
            SELECT COALESCE(
                (SELECT views_count FROM upsert_count),
                (SELECT views_count FROM page_views WHERE entity_type = $2 AND entity_id = $3),
                0
            ) AS views
        `, [user.id, entityType, entityId]);

        const views = Number(result.rows[0]?.views || 0);

        // --- Achievement Logic: Approval Camp Completion ---
        if (entityType === 'session' && entityId.startsWith('approvalcamp-')) {
            try {
                const viewCheck = await query(`
                    SELECT COUNT(DISTINCT entity_id) as unique_sessions
                    FROM view_logs
                    WHERE user_id = $1 AND entity_type = 'session' AND entity_id IN ('approvalcamp-1', 'approvalcamp-3', 'approvalcamp-4')
                `, [user.id]);

                if (parseInt(viewCheck.rows[0].unique_sessions) >= 3) {
                    const { updateUserStatus } = await import('@/lib/services/achievements');
                    await updateUserStatus(user.id, 'is_approval_unlocked', true);
                }
            } catch {
            }
        }

        return NextResponse.json({ views });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
