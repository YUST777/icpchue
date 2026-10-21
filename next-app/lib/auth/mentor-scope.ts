import 'server-only';

import { query } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/auth';

/**
 * The user IDs a mentor may see on the mentor dashboard, or null for "everyone".
 * Mentors with assigned trainees (mentor_trainees) see only those; instructors,
 * owners and mentors without assignments keep the full directory.
 */
export async function mentorVisibleUserIds(staff: AuthUser): Promise<Set<number> | null> {
    if (staff.role !== 'mentor') return null;
    const res = await query(
        `SELECT mt.student_id, u.id AS user_id
           FROM mentor_trainees mt
           LEFT JOIN auth.users au ON lower(au.email) = mt.student_id || '@horus.edu.eg'
           LEFT JOIN users u ON u.supabase_uid = au.id
          WHERE mt.mentor_user_id = $1`,
        [staff.id]
    );
    if (res.rows.length === 0) return null;
    const rows = res.rows as { student_id: string; user_id: string | null }[];
    return new Set(rows.filter((r) => r.user_id != null).map((r) => Number(r.user_id)));
}

export type MentorGroupOption = { name: string; mentorName: string | null; trainees: number };

/** Mentor 1..N with how many trainees each has on the dashboard (for owners/instructors). */
export async function mentorGroupOptions(): Promise<MentorGroupOption[]> {
    const res = await query(
        `SELECT g.name, g.mentor_name, COUNT(mt.id)::int AS trainees
           FROM mentor_groups g
           LEFT JOIN mentor_trainees mt ON mt.group_name = g.name
          WHERE g.season = 2027
          GROUP BY g.name, g.mentor_name, g.sort_order
          ORDER BY g.sort_order, g.name`
    );
    return (res.rows as { name: string; mentor_name: string | null; trainees: number }[])
        .map((r) => ({ name: r.name, mentorName: r.mentor_name, trainees: r.trainees }));
}

/** User IDs of the trainees assigned to one mentor group ("Mentor 3"). */
export async function mentorGroupUserIds(groupName: string): Promise<Set<number>> {
    const res = await query(
        `SELECT u.id AS user_id
           FROM mentor_trainees mt
           JOIN auth.users au ON lower(au.email) = mt.student_id || '@horus.edu.eg'
           JOIN users u ON u.supabase_uid = au.id
          WHERE mt.group_name = $1`,
        [groupName]
    );
    return new Set((res.rows as { user_id: string }[]).map((r) => Number(r.user_id)));
}
