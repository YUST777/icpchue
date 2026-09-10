import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/auth';
import { decrypt } from '@/lib/security/encryption';

export async function GET(req: NextRequest) {
    try {
        const authUser = await verifyAuth(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const targetUserIdParam = url.searchParams.get('target_user_id');
        let effectiveUserId = authUser.id;

        if (targetUserIdParam && targetUserIdParam !== String(authUser.id)) {
            const isStaff = authUser.role === 'mentor' || authUser.role === 'instructor' || authUser.role === 'owner';
            if (!isStaff) {
                return NextResponse.json({ error: 'Forbidden: Mentor privileges required' }, { status: 403 });
            }
            effectiveUserId = parseInt(targetUserIdParam, 10);
        }

        // Fetch user profile info
        const userRes = await query(`
            SELECT u.id, u.email, u.codeforces_handle, u.role, a.name as enc_name, a.student_id
            FROM users u
            LEFT JOIN applications a ON u.application_id = a.id
            WHERE u.id = $1
        `, [effectiveUserId]);

        const targetUserRow = userRes.rows[0];
        if (!targetUserRow) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        if (authUser.role === 'mentor' &&
            ['mentor', 'instructor', 'owner'].includes(String(targetUserRow.role)) &&
            effectiveUserId !== authUser.id) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const targetUserName = targetUserRow ? (decrypt(targetUserRow.enc_name) || targetUserRow.codeforces_handle || `Trainee #${effectiveUserId}`) : `User #${effectiveUserId}`;

        // Fetch logs for user
        const logsRes = await query(`
            SELECT 
                id,
                user_id,
                week_number,
                day_number,
                TO_CHAR(log_date, 'YYYY-MM-DD') as log_date,
                total_hours,
                is_missed,
                done_tasks,
                student_comment,
                mentor_comment,
                mentor_id,
                mentor_name,
                created_at,
                updated_at,
                submitted_at
            FROM user_discipline_logs
            WHERE user_id = $1
            ORDER BY week_number ASC, day_number ASC
        `, [effectiveUserId]);

        const existingLogs = logsRes.rows.map(row => ({
            ...row,
            total_hours: (row.total_hours === null || row.total_hours === undefined) ? null : Number(row.total_hours),
        }));
        const totalHours = existingLogs.reduce((sum, l) => sum + (l.is_missed ? 0 : Number(l.total_hours || 0)), 0);
        const activeDays = existingLogs.filter(l => !l.is_missed && Number(l.total_hours) > 0).length;
        const mentorReviewsCount = existingLogs.filter(l => Boolean(l.mentor_comment && l.mentor_comment.trim())).length;

        return NextResponse.json({
            success: true,
            effective_user: {
                id: effectiveUserId,
                name: targetUserName,
                email: targetUserRow?.email,
                role: targetUserRow?.role,
                is_self: effectiveUserId === authUser.id,
            },
            summary: {
                total_hours: Math.round(totalHours * 10) / 10,
                active_days: activeDays,
                mentor_reviews: mentorReviewsCount,
                total_entries: existingLogs.length,
            },
            logs: existingLogs,
        });
    } catch (err: unknown) {
        console.error('[Discipline API GET] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authUser = await verifyAuth(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { 
            target_user_id, 
            week_number, 
            day_number, 
            log_date, 
            total_hours, 
            is_missed, 
            done_tasks, 
            student_comment,
            mentor_comment 
        } = body;

        const weekNum = parseInt(week_number, 10);
        const dayNum = parseInt(day_number, 10);

        if (!weekNum || !dayNum || dayNum < 1 || dayNum > 7) {
            return NextResponse.json({ error: 'Invalid week_number or day_number (1-7)' }, { status: 400 });
        }

        let effectiveUserId = authUser.id;
        const isStaff = authUser.role === 'mentor' || authUser.role === 'instructor' || authUser.role === 'owner';

        if (target_user_id && target_user_id !== authUser.id) {
            if (!isStaff) {
                return NextResponse.json({ error: 'Forbidden: Mentor privileges required' }, { status: 403 });
            }
            effectiveUserId = parseInt(target_user_id, 10);
        }

        if (!Number.isSafeInteger(effectiveUserId) || effectiveUserId <= 0) {
            return NextResponse.json({ error: 'Invalid target user' }, { status: 400 });
        }
        if (authUser.role === 'mentor' && effectiveUserId !== authUser.id) {
            const targetRole = await query('SELECT role FROM users WHERE id = $1', [effectiveUserId]);
            if (['mentor', 'instructor', 'owner'].includes(String(targetRole.rows[0]?.role || ''))) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const hasTotalHours = total_hours !== undefined;
        const hasIsMissed = is_missed !== undefined;
        const hasDoneTasks = done_tasks !== undefined;
        const hasStudentComment = student_comment !== undefined;
        const hasMentorComment = mentor_comment !== undefined && isStaff;
        const hasLogDate = log_date !== undefined;

        const hours = (total_hours === null || total_hours === undefined || total_hours === '') 
            ? null 
            : Math.max(0, Math.min(24, parseFloat(total_hours) || 0));
        
        let validDate: Date | null = null;
        if (log_date) {
            const parsed = new Date(log_date);
            if (!isNaN(parsed.getTime())) {
                validDate = parsed;
            }
        }

        // Fetch mentor display name if mentor is commenting
        let mentorName: string | null = null;
        let mentorId: number | null = null;
        if (hasMentorComment) {
            mentorId = authUser.id;
            const mentorProfile = await query(`
                SELECT u.codeforces_handle, a.name as enc_name 
                FROM users u 
                LEFT JOIN applications a ON u.application_id = a.id 
                WHERE u.id = $1
            `, [authUser.id]);
            mentorName = mentorProfile.rows[0] ? (decrypt(mentorProfile.rows[0].enc_name) || mentorProfile.rows[0].codeforces_handle || `Mentor #${authUser.id}`) : 'Mentor';
        }

        // Safe UPSERT: partial updates NEVER wipe out other fields!
        const upsertQuery = `
            INSERT INTO user_discipline_logs (
                user_id, week_number, day_number, log_date, total_hours, is_missed,
                done_tasks, student_comment, mentor_comment, mentor_id, mentor_name,
                created_at, updated_at, submitted_at
            ) VALUES (
                $1, $2, $3, COALESCE($4, NOW()), $5, COALESCE($6, false),
                COALESCE($7, ''), COALESCE($8, ''), COALESCE($9, ''), $10, $11,
                NOW(), NOW(), NOW()
            )
            ON CONFLICT (user_id, week_number, day_number)
            DO UPDATE SET 
                total_hours = CASE WHEN $12::boolean THEN $5 ELSE user_discipline_logs.total_hours END,
                is_missed = CASE WHEN $13::boolean THEN $6 ELSE user_discipline_logs.is_missed END,
                done_tasks = CASE WHEN $14::boolean THEN $7 ELSE user_discipline_logs.done_tasks END,
                student_comment = CASE WHEN $15::boolean THEN $8 ELSE user_discipline_logs.student_comment END,
                mentor_comment = CASE WHEN $16::boolean THEN $9 ELSE user_discipline_logs.mentor_comment END,
                mentor_id = CASE WHEN $16::boolean THEN $10 ELSE user_discipline_logs.mentor_id END,
                mentor_name = CASE WHEN $16::boolean THEN $11 ELSE user_discipline_logs.mentor_name END,
                log_date = CASE WHEN $17::boolean AND $4 IS NOT NULL THEN $4 ELSE user_discipline_logs.log_date END,
                submitted_at = CASE WHEN ($14::boolean OR $15::boolean OR $12::boolean) THEN NOW() ELSE user_discipline_logs.submitted_at END,
                updated_at = NOW()
            RETURNING 
                id, user_id, week_number, day_number, 
                TO_CHAR(log_date, 'YYYY-MM-DD') as log_date,
                total_hours, is_missed, done_tasks, student_comment,
                mentor_comment, mentor_id, mentor_name,
                created_at, updated_at, submitted_at
        `;

        const queryParams = [
            effectiveUserId,                                   // $1
            weekNum,                                           // $2
            dayNum,                                            // $3
            validDate,                                         // $4
            hours,                                             // $5
            hasIsMissed ? Boolean(is_missed) : false,          // $6
            hasDoneTasks ? String(done_tasks) : null,          // $7
            hasStudentComment ? String(student_comment) : null,// $8
            hasMentorComment ? String(mentor_comment) : null,  // $9
            mentorId,                                          // $10
            mentorName,                                        // $11
            hasTotalHours,                                     // $12
            hasIsMissed,                                       // $13
            hasDoneTasks,                                      // $14
            hasStudentComment,                                 // $15
            hasMentorComment,                                  // $16
            hasLogDate,                                        // $17
        ];

        const res = await query(upsertQuery, queryParams);
        const log = res.rows[0];
        return NextResponse.json({ 
            success: true, 
            log: {
                ...log,
                total_hours: (log.total_hours === null || log.total_hours === undefined) ? null : Number(log.total_hours),
            } 
        });

    } catch (err: unknown) {
        console.error('[Discipline API POST] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
