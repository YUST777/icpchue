#!/usr/bin/env bun
/**
 * Delete all data for 8241043@horus.edu.eg to allow re-testing the full flow:
 * Apply → OTP → Register. Removes user, auth, application, and Redis keys.
 */

import { query } from '../lib/db/db';
import { createBlindIndex } from '../lib/security/encryption';
import { createAdminClient } from '../lib/supabase/admin';
import { redis } from '../lib/db/redis';

const EMAIL = '8241043@horus.edu.eg'.trim().toLowerCase();
const STUDENT_ID = '8241043';

async function run() {
    const blindIndex = createBlindIndex(EMAIL);
    if (!blindIndex) {
        console.error('Could not create blind index (BLIND_INDEX_SALT set?)');
        process.exit(1);
    }

    console.log('Deleting all data for', EMAIL, '...');

    // 1. Get user id and supabase_uid
    const userRow = await query(
        'SELECT id, supabase_uid FROM users WHERE email_blind_index = $1',
        [blindIndex]
    );
    const userId = userRow.rows[0]?.id;
    const supabaseUid = userRow.rows[0]?.supabase_uid;

    if (userId) {
        // 2. Delete child tables (order matters for FK)
        const childDeletes = [
            ['user_achievements', 'user_id'],
            ['login_logs', 'user_id'],
            ['view_logs', 'user_id'],
            ['news_reactions', 'user_id'],
            ['sheet_submissions', 'user_id'],
            ['user_progress', 'user_id'],
            ['user_workspaces', 'user_id'],
            ['training_submissions', 'user_id'],
            ['cf_submissions', 'user_id'],
        ];

        for (const [table, col] of childDeletes) {
            try {
                const r = await query(`DELETE FROM ${table} WHERE ${col} = $1`, [userId]);
                if (r.rowCount && r.rowCount > 0) {
                    console.log(`  Deleted ${r.rowCount} from ${table}`);
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.includes('does not exist')) continue;
                console.warn(`  Skip ${table}:`, msg);
            }
        }

        // user_stats if exists
        try {
            const r = await query('DELETE FROM user_stats WHERE user_id = $1', [userId]);
            if (r.rowCount && r.rowCount > 0) console.log(`  Deleted ${r.rowCount} from user_stats`);
        } catch {
            /* ignore */
        }

        // 3. Delete from users
        const usersRes = await query('DELETE FROM users WHERE id = $1', [userId]);
        console.log('  Deleted from users:', usersRes.rowCount);
    } else {
        console.log('  No user found in public.users');
    }

    // 4. Delete from Supabase auth
    if (supabaseUid) {
        try {
            const admin = createAdminClient();
            const { error } = await admin.auth.admin.deleteUser(supabaseUid);
            if (error) {
                console.warn('  Supabase deleteUser:', error.message);
            } else {
                console.log('  Deleted from Supabase auth');
            }
        } catch (e: unknown) {
            console.warn('  Supabase:', e instanceof Error ? e.message : String(e));
        }
    } else {
        // Try by email as fallback
        try {
            const admin = createAdminClient();
            const { data } = await admin.auth.admin.listUsers();
            const byEmail = data.users.find((u) => u.email?.toLowerCase() === EMAIL);
            if (byEmail) {
                await admin.auth.admin.deleteUser(byEmail.id);
                console.log('  Deleted from Supabase auth (by email)');
            }
        } catch (e: unknown) {
            console.warn('  Supabase fallback:', e instanceof Error ? e.message : String(e));
        }
    }

    // 5. Clear Redis keys (optional - may fail if Redis unreachable)
    try {
        await redis.del(`reg-verified:${EMAIL}`);
        if (supabaseUid) await redis.del(`pwd-reset-user:${supabaseUid}`);
        console.log('  Cleared Redis (reg-verified, pwd-reset)');
    } catch (e) {
        console.warn('  Redis skipped (unreachable):', e instanceof Error ? e.message : String(e));
    }

    // 6. Legacy password_resets table (by email)
    try {
        const r = await query('DELETE FROM password_resets WHERE email = $1', [EMAIL]);
        if (r.rowCount && r.rowCount > 0) console.log(`  Deleted ${r.rowCount} from password_resets`);
    } catch {
        /* ignore */
    }

    // 7. Delete application (enables fresh apply with same student_id)
    try {
        const appRes = await query(
            'DELETE FROM applications WHERE email_blind_index = $1 OR student_id = $2',
            [blindIndex, STUDENT_ID]
        );
        if (appRes.rowCount && appRes.rowCount > 0) {
            console.log('  Deleted from applications:', appRes.rowCount);
        }
    } catch (e) {
        console.warn('  Application delete:', e instanceof Error ? e.message : String(e));
    }

    // 8. recap_2025 if exists (student_id unique)
    try {
        const r = await query('DELETE FROM recap_2025 WHERE student_id = $1', [STUDENT_ID]);
        if (r.rowCount && r.rowCount > 0) console.log(`  Deleted ${r.rowCount} from recap_2025`);
    } catch {
        /* ignore */
    }

    console.log('Done. You can now apply and register again from scratch.');
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
