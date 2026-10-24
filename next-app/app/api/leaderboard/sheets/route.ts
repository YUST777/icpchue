import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { decrypt, createBlindIndex } from '@/lib/security/encryption';
import { formatDisplayName } from '@/lib/names';

/**
 * Detect if a string looks like encrypted data (any of the 3 formats):
 * - Legacy CryptoJS: starts with "U2FsdGVk"
 * - Legacy GCM: starts with "aes256gcm:"
 * - Cryptr (hex): long hex-only string (64+ chars)
 */
function isEncrypted(value: string): boolean {
    if (value.startsWith('U2FsdGVk')) return true;
    if (value.startsWith('aes256gcm:')) return true;
    // Cryptr outputs hex strings, typically 64+ chars with only hex characters
    if (value.length >= 64 && /^[0-9a-f]+$/i.test(value)) return true;
    return false;
}

/**
 * Try to decrypt a name, falling back to null if decryption fails.
 */
function decryptName(name: string | null): string | null {
    if (!name) return null;
    if (!isEncrypted(name)) return name;
    return decrypt(name);
}

export async function GET(req: NextRequest) {
    try {
        const level: Level = req.nextUrl.searchParams.get('level') === '1' ? 1 : 0;
        let currentUser: { id: number } | null = null;
        let isShadowBanned = false;

        try {
            currentUser = await verifyAuth(req);
            if (currentUser) {
                const userCheck = await query(
                    `SELECT is_shadow_banned FROM users WHERE id = $1`,
                    [currentUser.id]
                );
                isShadowBanned = userCheck.rows[0]?.is_shadow_banned === true;
            }
        } catch {
            // Unauthenticated
        }

        // Cache public view for 10 minutes
        if (isShadowBanned) {
            const data = await fetchLeaderboard(true, level);
            return NextResponse.json(data);
        }

        const data = await getCachedData(`leaderboard:sheets:public:v5:level${level}`, 600, async () => {
            return await fetchLeaderboard(false, level);
        });

        return NextResponse.json(data);

    } catch (error) {
        console.error('[SheetsLeaderboard] Error:', error);
        return NextResponse.json({
            success: false,
            leaderboard: [],
            error: 'Failed to fetch leaderboard'
        }, { status: 500 });
    }
}

type Level = 0 | 1;

/**
 * Level 0: everyone who applied for the coming season's Level 0 (and has an
 * account), together with the mentors and owners training alongside them.
 * Level 1: the students who entered the ECPC qualification as a team (/team).
 */
function cohortClause(level: Level): string {
    if (level === 0) {
        return `AND (
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
async function ecpcTeamUserIds(): Promise<number[]> {
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
    const ids = new Set<number>(matched.rows.map((r: { id: string }) => Number(r.id)));

    // A few accounts have a blind index built from another spelling of the address.
    const all = await query('SELECT id, email FROM users');
    for (const u of all.rows as { id: string; email: string }[]) {
        if (emails.has((safeDecrypt(u.email) || '').trim().toLowerCase())) ids.add(Number(u.id));
    }
    return [...ids];
}

function safeDecrypt(value: string | null): string | null {
    if (!value) return null;
    try { return decrypt(value); } catch { return value; }
}

async function fetchLeaderboard(isShadowBanned: boolean, level: Level) {
    const params = level === 1 ? [await ecpcTeamUserIds()] : [];
    const shadowBanClause = isShadowBanned
        ? ''
        : 'AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)';

    // Optimized: Added LIMIT 200 and better sorting
    const queryStr = `
        SELECT 
            u.id,
            u.email,
            u.profile_visibility,
            u.is_shadow_banned,
            a.name,
            uss.distinct_solved AS solved_count,
            uss.total_accepted AS accepted_count,
            uss.total_submissions
        FROM users u
        INNER JOIN user_solve_stats uss ON u.id = uss.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE uss.distinct_solved > 0
          AND uss.season_year = (SELECT year FROM seasons WHERE is_current LIMIT 1)
          ${cohortClause(level)}
          AND (
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
          )
          ${shadowBanClause}
        ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC, uss.last_solve_at ASC
        LIMIT 200
    `;

    const result = await query(queryStr, params);

    const leaderboard = result.rows.map((row: any) => {
        // Try to decrypt the name if it's encrypted, then shorten it
        const rawName = decryptName(row.name);
        const displayName = rawName ? formatDisplayName(rawName) : 'Member';

        return {
            userId: row.id,
            username: displayName,
            solvedCount: parseInt(row.solved_count) || 0,
            totalSubmissions: parseInt(row.total_submissions) || 0,
            acceptedCount: parseInt(row.accepted_count) || 0,
        };
    });

    return {
        success: true,
        leaderboard
    };
}
