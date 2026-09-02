import 'server-only';

import { redirect } from 'next/navigation';
import { query } from '@/lib/db/db';
import { createClient } from '@/lib/supabase/server';

type StaffRole = 'mentor' | 'instructor' | 'owner';

/**
 * Authorize a server-rendered dashboard segment before any client component
 * can be streamed. API authorization remains mandatory as a second layer.
 */
export async function requireDashboardRole(
    allowedRoles: readonly StaffRole[],
    returnPath: string,
): Promise<void> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect(`/login?redirect=${encodeURIComponent(returnPath)}`);
    }

    const result = await query<{ role: string | null }>(
        'SELECT role FROM users WHERE supabase_uid = $1 LIMIT 1',
        [user.id],
    );
    const role = result.rows[0]?.role;

    if (!role || !allowedRoles.includes(role as StaffRole)) {
        redirect('/dashboard');
    }
}
