/**
 * Legacy JWT utilities — kept for backward compatibility during migration.
 * New code should use Supabase Auth via lib/supabase/*.
 */
import { query } from '@/lib/db/db';

export interface JWTPayload {
    id: number;
    email: string;
    applicationId?: number;
    role?: string;
    tokenVersion?: number;
}

/** @deprecated Use Supabase admin.createUser or signInWithPassword instead */
export function signToken(_payload: object, _tokenVersion?: number, _expiresIn?: string): string {
    throw new Error('signToken is deprecated — use Supabase Auth');
}

/** @deprecated Use verifyAuth from lib/auth.ts */
export async function verifyToken(): Promise<JWTPayload | null> {
    return null;
}

/** @deprecated Use verifyAdmin from lib/auth.ts */
export async function verifyAdmin(): Promise<JWTPayload | null> {
    return null;
}

/** @deprecated Supabase handles session invalidation */
export async function invalidateAllSessions(userId: number): Promise<void> {
    await query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]);
}

/** @deprecated */
export async function getTokenVersion(userId: number): Promise<number> {
    const result = await query('SELECT token_version FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.token_version ?? 0;
}

/** @deprecated Supabase SSR handles cookies */
export function createTokenCookie(_token: string, _maxAgeDays?: number) {
    return {
        name: 'authToken' as const,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 0,
    };
}
