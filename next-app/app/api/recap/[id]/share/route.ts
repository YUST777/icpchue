
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getClientIp } from '@/lib/security/request';
import { createBlindIndex } from '@/lib/security/encryption';
import { randomUUID } from 'crypto';

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
        const ip = getClientIp(req);
        const ratelimit = await rateLimit(`recap_share:${ip}`, 5, 120);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const visibility = await query(`
            SELECT u.profile_visibility, u.show_public_profile
            FROM applications a
            JOIN users u ON u.application_id = a.id
            WHERE a.student_id = $1 OR a.student_id_blind_index = $2
            LIMIT 1
        `, [studentId, createBlindIndex(studentId)]);
        if (visibility.rows[0] &&
            (visibility.rows[0].profile_visibility === 'private' || visibility.rows[0].show_public_profile === false)) {
            return NextResponse.json({ error: 'This recap is private' }, { status: 403 });
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

        // Use per-request temporary names. A shared student-ID filename lets
        // concurrent requests overwrite one another and mix generated data.
        const requestId = randomUUID();
        const tempJsonPath = `/tmp/recap_${studentId}_${requestId}_in.json`;
        const tempImgPath = `/tmp/recap_${studentId}_${requestId}_out.png`;

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
