import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitResult = await rateLimit(`sheet-submit:${ip}`, 5, 60);
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many submissions. Please wait a minute.' }, { status: 429 });
        }

        const { sheet_name, problem_name, file_name, file_content } = await req.json();

        // Validate required fields
        if (!sheet_name || !problem_name || !file_name || !file_content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate file name (must be .cpp, .c, or .txt)
        if (!file_name.endsWith('.cpp') && !file_name.endsWith('.c') && !file_name.endsWith('.txt')) {
            return NextResponse.json({ error: 'Only .cpp, .c, or .txt files are allowed' }, { status: 400 });
        }

        // Validate file content size (max 100KB)
        if (file_content.length > 100 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum 100KB allowed.' }, { status: 400 });
        }

        // Sanitize inputs (basic truncation)
        const sanitizedSheetName = sheet_name.substring(0, 100);
        const sanitizedProblemName = problem_name.substring(0, 100);
        const sanitizedFileName = file_name.substring(0, 255);

        // Check for existing active submission
        const existingCheck = await query(
            'SELECT id FROM sheet_submissions WHERE user_id = $1 AND sheet_name = $2 AND problem_name = $3',
            [user.id, sanitizedSheetName, sanitizedProblemName]
        );

        if (existingCheck.rows.length > 0) {
            return NextResponse.json({ error: 'Submission already exists. Please delete the old one first.' }, { status: 409 });
        }

        // Insert submission into database
        const result = await query(
            `INSERT INTO sheet_submissions (user_id, sheet_name, problem_name, file_name, file_content, submitted_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [user.id, sanitizedSheetName, sanitizedProblemName, sanitizedFileName, file_content]
        );

        return NextResponse.json({
            success: true,
            message: 'Solution submitted successfully',
            submission: {
                id: result.rows[0].id,
                submitted_at: result.rows[0].submitted_at
            }
        }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
