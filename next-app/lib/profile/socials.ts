// Social links shown on a public profile. Stored as handles (not URLs) in
// users.social_links so a link can only ever point at the platform it claims.

export const SOCIALS = [
    { key: 'github', label: 'GitHub', url: (h: string) => `https://github.com/${h}` },
    { key: 'linkedin', label: 'LinkedIn', url: (h: string) => `https://www.linkedin.com/in/${h}` },
    { key: 'x', label: 'X', url: (h: string) => `https://x.com/${h}` },
    { key: 'facebook', label: 'Facebook', url: (h: string) => `https://www.facebook.com/${h}` },
    { key: 'instagram', label: 'Instagram', url: (h: string) => `https://www.instagram.com/${h}` },
    { key: 'telegram', label: 'Telegram', url: (h: string) => `https://t.me/${h}` },
    { key: 'youtube', label: 'YouTube', url: (h: string) => `https://www.youtube.com/@${h}` },
    { key: 'leetcode', label: 'LeetCode', url: (h: string) => `https://leetcode.com/u/${h}` },
] as const;

export type SocialKey = (typeof SOCIALS)[number]['key'];
export type SocialLinks = Partial<Record<SocialKey, string>>;

const HANDLE = /^[A-Za-z0-9._-]{1,64}$/;

/** Accepts a handle or a pasted profile URL and returns the bare handle, or null if it is not valid. */
export function toHandle(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    let v = raw.trim();
    if (!v) return null;
    // "https://github.com/name/" -> "name"; "linkedin.com/in/name" -> "name"; "@name" -> "name"
    if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}\//i.test(v)) {
        const parts = v.replace(/^https?:\/\//i, '').split(/[/?#]/).filter(Boolean);
        v = parts[parts.length - 1] ?? '';
        if (parts[1] === 'in' || parts[1] === 'u') v = parts[2] ?? v;
    }
    v = v.replace(/^@/, '');
    return HANDLE.test(v) ? v : null;
}

/** Keeps only known platforms with valid handles. */
export function cleanSocials(raw: unknown): SocialLinks {
    const out: SocialLinks = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const { key } of SOCIALS) {
        const h = toHandle((raw as Record<string, unknown>)[key]);
        if (h) out[key] = h;
    }
    return out;
}
