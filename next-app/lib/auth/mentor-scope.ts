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
