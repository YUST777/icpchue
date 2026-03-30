import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import fs from 'fs';
import path from 'path';

const PFPS_DIR = path.join(process.cwd(), 'public', 'pfps');

export async function DELETE(request: NextRequest) {
    try {
        // Verify authentication
        const authUser = await verifyAuth(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Rate limit: 10 per 60s
        const ratelimit = await rateLimit(`pfp_delete:${userId}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Get current profile picture
        const result = await query(
            'SELECT profile_picture FROM users WHERE id = $1',
            [userId]
        );

        const currentPfp = result.rows[0]?.profile_picture;

        if (!currentPfp) {
            return NextResponse.json({ error: 'No profile picture to delete' }, { status: 404 });
        }

        // Delete file from disk
        const filePath = path.join(PFPS_DIR, currentPfp);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch {
        }

        // Update database
        await query(
            'UPDATE users SET profile_picture = NULL WHERE id = $1',
            [userId]
        );

        return NextResponse.json({ success: true, message: 'Profile picture deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
