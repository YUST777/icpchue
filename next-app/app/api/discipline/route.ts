import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth, verifyMentor } from '@/lib/auth/auth';
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
                updated_at
            FROM user_discipline_logs
            WHERE user_id = $1
            ORDER BY week_number ASC, day_number ASC
        `, [effectiveUserId]);

        const existingLogs = logsRes.rows;
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

        const hours = is_missed ? 0 : Math.max(0, Math.min(24, parseFloat(total_hours) || 0));
        const parsedDate = log_date ? new Date(log_date) : new Date();
        const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        // Upsert log
        let upsertQuery = '';
        let queryParams: any[] = [];

        if (isStaff && mentor_comment !== undefined) {
            // Mentor commenting or editing
            // Fetch mentor display name
            const mentorProfile = await query(`
                SELECT u.codeforces_handle, a.name as enc_name 
                FROM users u 
                LEFT JOIN applications a ON u.application_id = a.id 
                WHERE u.id = $1
            `, [authUser.id]);
            const mentorName = mentorProfile.rows[0] ? (decrypt(mentorProfile.rows[0].enc_name) || mentorProfile.rows[0].codeforces_handle || `Mentor #${authUser.id}`) : 'Mentor';

            if (effectiveUserId === authUser.id) {
                // Self editing student part
                upsertQuery = `
                    INSERT INTO user_discipline_logs (
                        user_id, week_number, day_number, log_date, total_hours, is_missed, done_tasks, student_comment, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (user_id, week_number, day_number)
                    DO UPDATE SET 
                        log_date = EXCLUDED.log_date,
                        total_hours = EXCLUDED.total_hours,
                        is_missed = EXCLUDED.is_missed,
                        done_tasks = EXCLUDED.done_tasks,
                        student_comment = EXCLUDED.student_comment,
                        updated_at = NOW()
                    RETURNING *
                `;
                queryParams = [effectiveUserId, weekNum, dayNum, validDate, hours, Boolean(is_missed), done_tasks || '', student_comment || ''];
            } else {
                // Mentor writing feedback
                upsertQuery = `
                    INSERT INTO user_discipline_logs (
                        user_id, week_number, day_number, log_date, total_hours, is_missed, done_tasks, student_comment, mentor_comment, mentor_id, mentor_name, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                    ON CONFLICT (user_id, week_number, day_number)
                    DO UPDATE SET 
                        mentor_comment = EXCLUDED.mentor_comment,
                        mentor_id = EXCLUDED.mentor_id,
                        mentor_name = EXCLUDED.mentor_name,
                        updated_at = NOW()
                    RETURNING *
                `;
                queryParams = [effectiveUserId, weekNum, dayNum, validDate, hours, Boolean(is_missed), done_tasks || '', student_comment || '', mentor_comment || '', authUser.id, mentorName];
            }
        } else {
            // Student updating their log
            upsertQuery = `
                INSERT INTO user_discipline_logs (
                    user_id, week_number, day_number, log_date, total_hours, is_missed, done_tasks, student_comment, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (user_id, week_number, day_number)
                DO UPDATE SET 
                    log_date = EXCLUDED.log_date,
                    total_hours = EXCLUDED.total_hours,
                    is_missed = EXCLUDED.is_missed,
                    done_tasks = EXCLUDED.done_tasks,
                    student_comment = EXCLUDED.student_comment,
                    updated_at = NOW()
                RETURNING *
            `;
            queryParams = [effectiveUserId, weekNum, dayNum, validDate, hours, Boolean(is_missed), done_tasks || '', student_comment || ''];
        }

        const res = await query(upsertQuery, queryParams);
        return NextResponse.json({ success: true, log: res.rows[0] });

    } catch (err: unknown) {
        console.error('[Discipline API POST] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
