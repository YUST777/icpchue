import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Standard Next.js params
) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authResult;

    // Await params
    const { id: achievementId } = await params;

    try {
        const result = await query(
            `UPDATE user_achievements SET seen = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, achievement_id, seen`,
            [achievementId, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
        }

        await invalidateCache(`user:${user.id}:achievements`);

        return NextResponse.json({ success: true, achievement: result.rows[0] });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
