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

// ── In-Memory Auth Cache to prevent Supabase API exhaustion during polling ──
// Submissions poll every 2s. Hitting Supabase Auth API + PostgreSQL every 2s exhausts 
// Node.js sockets and DB connection pools. Note: Next.js 'standalone' keeps module state.
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const authCache = new Map<string, { user: AuthUser; expiresAt: number }>();

// Simple cleanup interval to prevent memory leaks over time
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of authCache.entries()) {
        if (val.expiresAt < now) authCache.delete(key);
    }
}, 5 * 60 * 1000); // Check every 5 mins

/**
 * Verify a request's Supabase session and return the application user.
 * Returns the same shape as the old JWT-based verifyAuth so all routes work unchanged.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
    try {
        // Build a cache key from Supabase auth cookies
        const allCookies = req.cookies.getAll();
        const authCookies = allCookies.filter(c => c.name.includes('sb-') && c.name.includes('-auth-token'));
        
        // If there are no auth cookies, user is definitely not logged in
        if (authCookies.length === 0) return null;

        // Create a unique key based on the token payloads
        const cacheKey = authCookies.map(c => `${c.name}=${c.value}`).join(';');
        
        // Check cache first
        const cached = authCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.user;
        }

        const supabase = createSupabaseFromRequest(req);
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) return null;

        const result = await query(
            'SELECT id, email, application_id, role FROM users WHERE supabase_uid = $1',
            [authUser.id]
        );

        if (result.rows.length === 0) return null;

        const userRow = result.rows[0];
        const user: AuthUser = {
            id: userRow.id,
            email: authUser.email || '',
            applicationId: userRow.application_id,
            role: userRow.role || 'trainee',
        };

        // Save to cache
        authCache.set(cacheKey, { user, expiresAt: Date.now() + CACHE_TTL_MS });

        return user;
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
