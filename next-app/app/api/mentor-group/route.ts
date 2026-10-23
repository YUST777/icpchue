import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query, withTransaction } from '@/lib/db/db';

const SEASON = 2027;

type GroupRow = { name: string; mentor_name: string | null; invite_link: string };

const groupJson = (g: GroupRow) => ({ name: g.name, mentorName: g.mentor_name, inviteLink: g.invite_link });

/**
 * The signed-in trainee's mentor WhatsApp group for the current season.
 * Assigned trainees get their group; unassigned Level 0 applicants are placed
 * in the group with the fewest members (random among ties) while it has room.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const email = (user.email || '').trim().toLowerCase();
        const studentId = /^(\d{5,12})@horus\.edu\.eg$/.exec(email)?.[1] ?? null;
        if (!studentId) return NextResponse.json({ status: 'not_enrolled' });
        // Mentors, instructors and owners lead groups; they are never placed in one as a trainee.
        if (user.role === 'mentor' || user.role === 'instructor' || user.role === 'owner') {
            return NextResponse.json({ status: 'staff' });
        }

        // Already placed: record the visit (mentors follow up with who never opened it).
        const existing = await query(
            `WITH opened AS (
                UPDATE mentor_group_members
                   SET last_opened_at = now(), first_opened_at = COALESCE(first_opened_at, now()), open_count = open_count + 1
                 WHERE season = $1 AND student_id = $2
                RETURNING group_id
             )
             SELECT g.name, g.mentor_name, g.invite_link FROM opened JOIN mentor_groups g ON g.id = opened.group_id`,
            [SEASON, studentId]
        );
        if (existing.rows[0]) return NextResponse.json({ status: 'assigned', group: groupJson(existing.rows[0]) });

        // Every trainee with an account gets a group (2026 and 2027 seasons alike);
        // the account itself is the proof of enrollment.
        // Serialize placements so two trainees cannot overfill the same group.
        const result = await withTransaction(async (client) => {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`mentor-groups-${SEASON}`]);
            const already = await client.query(
                `SELECT g.name, g.mentor_name, g.invite_link
                 FROM mentor_group_members m JOIN mentor_groups g ON g.id = m.group_id
                 WHERE m.season = $1 AND m.student_id = $2`,
                [SEASON, studentId]
            );
            if (already.rows[0]) return { status: 'assigned', group: groupJson(already.rows[0]) };
            const pick = await client.query(
                `SELECT g.id, g.name, g.mentor_name, g.invite_link
                 FROM mentor_groups g
                 LEFT JOIN mentor_group_members m ON m.group_id = g.id
                 WHERE g.season = $1
                 GROUP BY g.id
                 HAVING COUNT(m.id) < g.capacity
                 ORDER BY COUNT(m.id), random()
                 LIMIT 1`,
                [SEASON]
            );
            if (!pick.rows[0]) return { status: 'full' };
            await client.query(
                `INSERT INTO mentor_group_members (season, student_id, group_id, source, first_opened_at, last_opened_at, open_count)
                 VALUES ($1, $2, $3, $4, now(), now(), 1)`,
                [SEASON, studentId, pick.rows[0].id, 'auto']
            );
            // Auto-sync into mentor_trainees so the mentor immediately sees the trainee on their dashboard
            const mentorRes = await client.query(
                `SELECT mentor_user_id FROM mentor_trainees WHERE group_name = $1 LIMIT 1`,
                [pick.rows[0].name]
            );
            if (mentorRes.rows[0]?.mentor_user_id) {
                await client.query(
                    `INSERT INTO mentor_trainees (mentor_user_id, student_id, group_name, assigned_at)
                     VALUES ($1, $2, $3, now())
                     ON CONFLICT (mentor_user_id, student_id) DO NOTHING`,
                    [mentorRes.rows[0].mentor_user_id, studentId, pick.rows[0].name]
                );
            }
            return { status: 'assigned', group: groupJson(pick.rows[0]) };
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Mentor Group] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Could not load your mentor group.' }, { status: 500 });
    }
}

/** Records a tap on "Join on WhatsApp" (the closest signal the site has that a trainee joined). */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });
        const studentId = /^(\d{5,12})@horus\.edu\.eg$/.exec((user.email || '').trim().toLowerCase())?.[1];
        if (!studentId) return NextResponse.json({ ok: true });
        await query(
            `UPDATE mentor_group_members
                SET join_clicks = join_clicks + 1, first_join_click_at = COALESCE(first_join_click_at, now())
              WHERE season = $1 AND student_id = $2`,
            [SEASON, studentId]
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Mentor Group] Join click failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
