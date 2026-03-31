import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';

/**
 * GET /api/sheets/solved?sheetId=X&contestId=Y
 * Returns ONLY the list of solved problem IDs for a sheet.
 * Uses user_progress table (single source of truth for solved status).
 * Much lighter than fetching all submissions.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const sheetId = searchParams.get('sheetId');
        const contestId = searchParams.get('contestId');

        if (!contestId) {
            return NextResponse.json({ error: 'contestId is required' }, { status: 400 });
        }

        const cacheKey = `user:${user.id}:solved:${contestId}`;
        const solvedIds = await getCachedData(cacheKey, 120, async () => {
            // Get all solved problems for this contest from user_progress
            const result = await query(
                `SELECT problem_id FROM user_progress 
                 WHERE user_id = $1 AND status = 'SOLVED' AND problem_id LIKE $2`,
                [user.id, `${contestId}:%`]
            );

            // Extract just the problem letter from "contestId:letter" format
            return result.rows.map((r: { problem_id: string }) => {
                const parts = r.problem_id.split(':');
                return parts[parts.length - 1]; // Return just the letter (A, B, C...)
            });
        });

        return NextResponse.json({ success: true, solvedIds });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
