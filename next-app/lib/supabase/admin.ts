import { createClient, type User } from '@supabase/supabase-js';

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

/**
 * Resolve an Auth user without relying on the application database's blind
 * index. This is intentionally used only as a fallback for duplicate checks:
 * blind-index keys may be rotated while Supabase Auth remains canonical.
 */
export async function findAuthUserByEmail(email: string): Promise<User | null> {
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
