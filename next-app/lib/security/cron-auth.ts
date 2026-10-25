import crypto from 'crypto';
import type { NextRequest } from 'next/server';

/** True when the request carries `Authorization: Bearer $CRON_SECRET`, compared in constant time. */
export function isCronAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const given = Buffer.from(req.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
