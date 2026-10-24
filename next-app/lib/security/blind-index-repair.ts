import { query } from '@/lib/db/db';
import { createBlindIndex } from '@/lib/security/encryption';

/**
 * A few accounts carry an email blind index that does not match their address
 * (it was built from another spelling). Lookups by student ID then fall back to
 * decrypting every account's email, which takes tens of seconds. Writing the
 * index the way registration builds it makes the fast lookup work again.
 */
export async function repairEmailBlindIndex(userId: number | string, email: string): Promise<void> {
    // Local dev shares the production database but not its blind-index salt; never write from there.
    if (process.env.NODE_ENV !== 'production') return;
    const index = createBlindIndex(email);
    if (!index) return;
    try {
        await query(
            'UPDATE users SET email_blind_index = $1 WHERE id = $2 AND email_blind_index IS DISTINCT FROM $1',
            [index, userId]
        );
    } catch (error) {
        console.error('[BlindIndex] Repair failed for user', userId, error instanceof Error ? error.message : error);
    }
}
