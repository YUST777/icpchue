import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';

export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await query(
            `SELECT id, title, message, type, is_read, created_at 
             FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 20`,
            [authResult.id]
        );

        return NextResponse.json({ notifications: result.rows });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Mark all as read if no ID provided, or specific ID
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (id) {
            await query(
                `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
                [id, authResult.id]
            );
        } else {
            await query(
                `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
                [authResult.id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
