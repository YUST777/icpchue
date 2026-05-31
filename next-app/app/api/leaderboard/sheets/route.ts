import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { decrypt } from '@/lib/security/encryption';

// Extract first and last name
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);
    if (parts.length <= 2) return cleaned.trim();
    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;
    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        return `${firstName} ${secondToLast} ${lastPart}`;
    }
    if (/^(al|el|abd|abu)-/i.test(lastPart)) {
        return `${firstName} ${lastPart}`;
    }
    return `${firstName} ${lastPart}`;
}

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
            const data = await fetchLeaderboard(true);
            return NextResponse.json(data);
        }

        const data = await getCachedData('leaderboard:sheets:public', 600, async () => {
            return await fetchLeaderboard(false);
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

async function fetchLeaderboard(isShadowBanned: boolean) {
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
          AND (
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
          )
          ${shadowBanClause}
        ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC, uss.last_solve_at ASC
        LIMIT 200
    `;

    const result = await query(queryStr);

    const leaderboard = result.rows.map((row: any) => {
        // Try to decrypt the name if it's encrypted, then shorten it
        const rawName = decryptName(row.name);
        const displayName = rawName 
            ? getShortName(rawName) 
            : row.email?.split('@')[0] || 'Anonymous';

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
