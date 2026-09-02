import type { NextRequest } from 'next/server';

/**
 * Return the address supplied by the closest trusted proxy.
 *
 * Taking the first value from x-forwarded-for lets a caller prepend an
 * arbitrary address and bypass IP-based limits. Vercel/Cloudflare append the
 * client address to the chain, so the last valid value is the safe choice.
 */
export function getClientIp(request: NextRequest): string {
    const candidates = [
        request.headers.get('x-vercel-forwarded-for'),
        request.headers.get('cf-connecting-ip'),
        request.headers.get('x-real-ip'),
        request.headers.get('x-forwarded-for')?.split(',').reverse().join(','),
    ];

    for (const candidate of candidates) {
        const value = candidate?.split(',')[0]?.trim();
        if (value && isPlausibleIp(value)) return value;
    }

    return 'unknown';
}

function isPlausibleIp(value: string): boolean {
    // IPv4 (including 0.0.0.0) or a conservative IPv6 character check.
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return value.split('.').every(part => Number(part) >= 0 && Number(part) <= 255);
    }
    return /^[0-9a-f:]+$/i.test(value) && value.includes(':') && value.length <= 45;
}
