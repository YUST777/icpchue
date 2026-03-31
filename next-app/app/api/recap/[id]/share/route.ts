
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id?: string }> }) {
    try {
        const params = await props.params;
        const studentId = params?.id;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
        }

        // Sanitize studentId — only allow alphanumeric, hyphens, underscores (prevent path traversal + command injection)
        if (!/^[a-zA-Z0-9_-]+$/.test(studentId)) {
            return NextResponse.json({ error: 'Invalid student ID format' }, { status: 400 });
        }

        // Rate limit: 5 per 120s per IP (Python generation is expensive)
        const ip = req.headers.get('x-forwarded-for') || 'anonymous';
        const ratelimit = await rateLimit(`recap_share:${ip}`, 5, 120);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // 1. Fetch Data from Snapshot Table
        const recapRes = await query(`
            SELECT * FROM recap_2025 WHERE student_id = $1 LIMIT 1
        `, [studentId]);

        if (recapRes.rows.length === 0) {
            return NextResponse.json({ error: 'Recap not found' }, { status: 404 });
        }

        const data = recapRes.rows[0];

        const scriptData = {
            username: data.username,
            avatarUrl: data.avatar_url,
            daysActive: data.days_active,
            totalSolved: data.total_solved,
            totalSubmissions: data.total_submissions,
            topProblem: data.top_problem,
            topProblemAttempts: data.top_problem_attempts,
            rankPercentile: data.rank_percentile,
            maxStreak: data.max_streak,
            preferredLanguage: data.preferred_language,
            topTags: data.top_tags,
            achievements: data.achievements
        };

        const tempJsonPath = `/tmp/recap_${studentId}_in.json`;
        const tempImgPath = `/tmp/recap_${studentId}_out.png`;

        await fs.promises.writeFile(tempJsonPath, JSON.stringify(scriptData));

        // 2. Run Python Script (execFile is immune to shell injection — args passed as array, not shell string)
        const scriptPath = path.join(process.cwd(), 'scripts/generate_recap_image.py');
        await execFileAsync('python3', [scriptPath, tempJsonPath, tempImgPath]);

        // 3. Read Output Image
        const imageBuffer = await fs.promises.readFile(tempImgPath);

        // Cleanup temp files
        await Promise.all([
            fs.promises.unlink(tempJsonPath).catch(() => { }),
            fs.promises.unlink(tempImgPath).catch(() => { })
        ]);

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="icpchue-recap-${studentId}.png"`,
            },
        });

    } catch (error: unknown) {
        console.error('[Recap Share] Error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed to generate recap image' }, { status: 500 });
    }
}
