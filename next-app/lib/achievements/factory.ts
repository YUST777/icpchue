/**
 * Accounts left out of every badge statistic: member totals, holder counts,
 * rarity and serial numbers. The owner can still see their own badges.
 */
export const UNCOUNTED_USER_IDS: number[] = [103];

/**
 * A number printed on a physical badge: unique per issued badge (the row id is
 * globally unique), with a short check so a mistyped number is easy to spot.
 */
export function factoryNumber(rowId: number | string): string {
    const id = Number(rowId);
    let h = 2166136261;
    for (const ch of `hue:${id}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return `HUE-${String(id).padStart(6, '0')}-${(h & 0xfff).toString(16).toUpperCase().padStart(3, '0')}`;
}

/**
 * Serial = place among everyone who earned the badge, first earner first. Order is the real
 * earned time, then who joined first, then record id, so ties are settled the same way every time.
 */
export const SERIAL_CTE = (excludedParam: string) => `
    ranked AS (
        SELECT ua.id, ROW_NUMBER() OVER (PARTITION BY ua.achievement_id ORDER BY ua.earned_at, u.created_at, ua.id)::int AS serial
        FROM user_achievements ua
        JOIN users u ON u.id = ua.user_id
        WHERE ua.user_id <> ALL(${excludedParam}::int[])
    )`;
