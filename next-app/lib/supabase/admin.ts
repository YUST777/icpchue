import { createClient, type User } from '@supabase/supabase-js';
import { query } from '@/lib/db/db';

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase admin configuration is not set');
    }

    return createClient(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export type AuthUserSummary = Pick<User, 'id' | 'email' | 'email_confirmed_at' | 'user_metadata'>;

/**
 * Resolve an Auth user without relying on the application database's blind
 * index: blind-index keys may be rotated while Supabase Auth remains canonical.
 *
 * The primary path is a single indexed lookup on auth.users through the
 * server-side Postgres connection. The previous implementation paged through
 * `auth.admin.listUsers`, which is slow, grows with the user base, and made
 * every OTP request fail when the Admin API rejected the call. The Admin API
 * remains as a fallback when the database lookup is unavailable.
 */
export async function findAuthUserByEmail(email: string): Promise<AuthUserSummary | null> {
    const normalizedEmail = email.trim().toLowerCase();
    try {
        const result = await query<{
            id: string;
            email: string | null;
            email_confirmed_at: Date | string | null;
            raw_user_meta_data: Record<string, unknown> | null;
        }>(
            `SELECT id, email, email_confirmed_at, raw_user_meta_data
               FROM auth.users
              WHERE lower(email) = $1
                AND deleted_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1`,
            [normalizedEmail]
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            id: row.id,
            email: row.email ?? undefined,
            email_confirmed_at: row.email_confirmed_at ? new Date(row.email_confirmed_at).toISOString() : undefined,
            user_metadata: row.raw_user_meta_data ?? {},
        };
    } catch (error) {
        console.error('[Auth lookup] auth.users query failed; falling back to Admin API:', error instanceof Error ? error.message : error);
    }

    return findAuthUserByEmailViaAdminApi(normalizedEmail);
}

async function findAuthUserByEmailViaAdminApi(email: string): Promise<AuthUserSummary | null> {
    const admin = createAdminClient();
    const perPage = 1000;

    for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;

        const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
        if (match) return match;
        if (data.users.length < perPage) return null;
    }

    throw new Error('Could not complete the Auth user lookup');
}
