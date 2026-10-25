import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';
import { decrypt, createBlindIndex } from '@/lib/security/encryption';

/**
 * Detect if a string looks like encrypted data (any of the 3 formats):
 * - Legacy CryptoJS: starts with "U2FsdGVk"
 * - Legacy GCM: starts with "aes256gcm:"
 * - Cryptr (hex): long hex-only string (64+ chars)
 */
export function isEncrypted(value: string): boolean {
    if (value.startsWith('U2FsdGVk')) return true;
    if (value.startsWith('aes256gcm:')) return true;
    // Cryptr outputs hex strings, typically 64+ chars with only hex characters
    if (value.length >= 64 && /^[0-9a-f]+$/i.test(value)) return true;
    return false;
}

/**
 * Try to decrypt a name, falling back to null if decryption fails.
 */
export function decryptName(name: string | null): string | null {
    if (!name) return null;
    if (!isEncrypted(name)) return name;
    return decrypt(name);
}

export type Level = 0 | 1;

// Students who are past Level 1 (Level 2 training) and so rank on neither board.
export const LEVEL_2_USER_IDS = new Set<number>([156]); // Ahmed Ashraf Elbayoumi

/**
 * Level 0: everyone who applied for the coming season's Level 0 (and has an
 * account), together with the mentors and owners training alongside them.
 * Level 1: the students who entered the ECPC qualification as a team (/team).
 */
export function cohortClause(level: Level): string {
    if (level === 0) {
        // Students who went on to the ECPC teams are ranked on Level 1 only.
        return `AND NOT (u.id = ANY($1::bigint[]))
        AND (
            u.role IN ('mentor', 'instructor', 'owner')
            OR EXISTS (
                SELECT 1 FROM level0_training_registrations r
                WHERE r.application_id = u.application_id
                  AND r.season_year = (SELECT MAX(season_year) FROM level0_training_registrations)
            )
        )`;
    }
    return 'AND u.id = ANY($1::bigint[])';
}

/** Account ids of everyone listed on a registered ECPC team (student ID or ICPC HUE email). */
export async function ecpcTeamUserIds(): Promise<number[]> {
    return getCachedData('ecpc:team:user_ids:v2', 600, async () => {
        const teams = await query(
            `SELECT member1_student_id, member2_student_id, member3_student_id,
                    member1_icpc_email, member2_icpc_email, member3_icpc_email
             FROM team_registrations
             WHERE season_year = (SELECT year FROM seasons WHERE is_current LIMIT 1)`
        );
        const emails = new Set<string>();
        for (const row of teams.rows) {
            for (const n of [1, 2, 3]) {
                const studentId = (safeDecrypt(row[`member${n}_student_id`]) || '').replace(/\D/g, '');
                if (studentId) emails.add(`${studentId}@horus.edu.eg`);
                const icpcEmail = (safeDecrypt(row[`member${n}_icpc_email`]) || '').trim().toLowerCase();
                if (icpcEmail) emails.add(icpcEmail);
            }
        }
        if (emails.size === 0) return [];

        const blindIndexes = [...emails].map(e => createBlindIndex(e)).filter((h): h is string => Boolean(h));
        const matched = await query('SELECT id FROM users WHERE email_blind_index = ANY($1::text[])', [blindIndexes]);
        return matched.rows.map((r: { id: string }) => Number(r.id));
    });
}

export function safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try { return decrypt(value); } catch { return value; }
}

