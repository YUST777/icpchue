import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership and delete in one go
        const result = await query( // Changed from 'pool.query' to 'query'
            'DELETE FROM sheet_submissions WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, user.id]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Submission deleted successfully' });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
