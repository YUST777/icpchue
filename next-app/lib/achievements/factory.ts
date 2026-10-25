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

/** Serial = place among everyone who earned the badge, not counting the uncounted accounts. */
export const SERIAL_CTE = (excludedParam: string) => `
    ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY achievement_id ORDER BY earned_at, id)::int AS serial
        FROM user_achievements
        WHERE user_id <> ALL(${excludedParam}::int[])
    )`;
