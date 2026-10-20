import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query, withTransaction } from '@/lib/db/db';
import { createBlindIndex } from '@/lib/security/encryption';

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

        const existing = await query(
            `SELECT g.name, g.mentor_name, g.invite_link
             FROM mentor_group_members m JOIN mentor_groups g ON g.id = m.group_id
             WHERE m.season = $1 AND m.student_id = $2`,
            [SEASON, studentId]
        );
        if (existing.rows[0]) return NextResponse.json({ status: 'assigned', group: groupJson(existing.rows[0]) });

        // Only this season's Level 0 applicants get a group.
        const enrolled = await query(
            `SELECT 1 FROM level0_training_registrations
             WHERE season_year = $1 AND status <> 'cancelled'
               AND (email_blind_index = $2 OR student_id_blind_index = $3)
             LIMIT 1`,
            [SEASON, createBlindIndex(email), createBlindIndex(studentId)]
        );
        if (!enrolled.rows[0]) return NextResponse.json({ status: 'not_enrolled' });

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
                'INSERT INTO mentor_group_members (season, student_id, group_id, source) VALUES ($1, $2, $3, $4)',
                [SEASON, studentId, pick.rows[0].id, 'auto']
            );
            return { status: 'assigned', group: groupJson(pick.rows[0]) };
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Mentor Group] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Could not load your mentor group.' }, { status: 500 });
    }
}
