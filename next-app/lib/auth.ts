import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { query } from '@/lib/db';

export interface AuthUser {
    id: number;
    email: string;
    applicationId?: number;
    role?: string;
}

function createSupabaseFromRequest(req: NextRequest) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll() {
                    // API routes are read-only for cookies here; 
                    // cookie writes happen in middleware and route responses
                },
            },
        }
    );
}

/**
 * Verify a request's Supabase session and return the application user.
 * Returns the same shape as the old JWT-based verifyAuth so all routes work unchanged.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
    try {
        const supabase = createSupabaseFromRequest(req);
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) return null;

        const result = await query(
            'SELECT id, email, application_id, role FROM users WHERE supabase_uid = $1',
            [authUser.id]
        );

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        return {
            id: user.id,
            email: authUser.email || '',
            applicationId: user.application_id,
            role: user.role || 'trainee',
        };
    } catch (err) {
        console.error('[Auth] verifyAuth error:', err);
        return null;
    }
}

/**
 * Verify admin access: Supabase session + DB role check.
 */
export async function verifyAdmin(req: NextRequest): Promise<AuthUser | null> {
    const user = await verifyAuth(req);
    if (!user) return null;

    const role = user.role;
    if (role !== 'owner' && role !== 'instructor') {
        console.warn(`[Admin] User ${user.id} has insufficient role: ${role}`);
        return null;
    }
    return user;
}
