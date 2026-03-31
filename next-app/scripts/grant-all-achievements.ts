#!/usr/bin/env bun
/**
 * Grant all achievements to 8241043@horus.edu.eg
 */

import { query } from '../lib/db/db';
import { createBlindIndex } from '../lib/security/encryption';
import { grantAchievement, ACHIEVEMENTS } from '../lib/services/achievements';

const EMAIL = '8241043@horus.edu.eg'.trim().toLowerCase();

async function run() {
    const blindIndex = createBlindIndex(EMAIL);
    if (!blindIndex) {
        console.error('Could not create blind index');
        process.exit(1);
    }

    const userRow = await query('SELECT id FROM users WHERE email_blind_index = $1', [blindIndex]);
    const userId = userRow.rows[0]?.id;

    if (!userId) {
        console.error('User not found:', EMAIL);
        process.exit(1);
    }

    console.log('Granting all achievements to user', userId, '(' + EMAIL + ')');

    const all = [
        ACHIEVEMENTS.WELCOME,
        ACHIEVEMENTS.APPROVAL,
        ACHIEVEMENTS.SHEET_1,
        ACHIEVEMENTS.RANK_500,
        ACHIEVEMENTS.INSTRUCTOR,
    ];

    for (const ach of all) {
        const granted = await grantAchievement(userId, ach);
        console.log('  ', ach, granted ? '✓' : '(already had)');
    }

    // Update users table for role-based and CF-based achievements
    // (sheet_1_solved and is_approval_unlocked are now derived from user_achievements)
    await query(
        `UPDATE users SET 
          role = 'owner',
          codeforces_data = COALESCE(codeforces_data, '{}'::jsonb) || '{"rating": "500"}'::jsonb
        WHERE id = $1`,
        [userId]
    );
    console.log('  Updated role=owner, codeforces_data.rating=500');

    // Invalidate profile cache so changes show immediately
    try {
        const { invalidateCache } = await import('../lib/cache/cache');
        const { CACHE_VERSION } = await import('../lib/cache/cache-version');
        await invalidateCache(`user:${userId}:profile:${CACHE_VERSION}`);
        await invalidateCache(`user:${userId}:achievements`);
        console.log('  Cache invalidated');
    } catch {
        /* ignore */
    }

    console.log('Done. Refresh the page or re-login to see all 5 unlocked.');
    process.exit(0);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
