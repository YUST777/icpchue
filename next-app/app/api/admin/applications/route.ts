import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        const result = await query(`
            SELECT a.id, a.name, a.faculty, a.student_id, a.student_level, a.codeforces_profile,
                a.submitted_at, a.application_type, a.scraping_status,
                u.id AS user_id
            FROM applications a
            LEFT JOIN users u ON u.application_id = a.id
            ORDER BY a.submitted_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await query('SELECT COUNT(*)::int AS c FROM applications');
        const total = countRes.rows[0]?.c ?? 0;

        const applications = result.rows.map((r: Record<string, unknown>) => ({
            id: r.id,
            name: r.name,
            faculty: r.faculty,
            studentId: r.student_id,
            studentLevel: r.student_level,
            codeforcesProfile: r.codeforces_profile,
            submittedAt: r.submitted_at,
            applicationType: r.application_type,
            scrapingStatus: r.scraping_status,
            userId: r.user_id
        }));

        return NextResponse.json({
            success: true,
            applications,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
