import crypto from 'crypto';

export interface CodeforcesData {
    handle: string;
    rating: number;
    maxRating: number;
    rank: string;
    maxRank: string;
    contribution: number;
    friendOfCount: number;
    lastOnlineTimeSeconds: number;
    registrationTimeSeconds: number;
    lastUpdated: string; // ISO date string
}

export interface CFSubmission {
    id: number;
    contestId: number;
    creationTimeSeconds: number;
    relativeTimeSeconds: number;
    problem: {
        contestId: number;
        index: string;
        name: string;
        type: string;
        points?: number;
        rating?: number;
        tags: string[];
    };
    author: {
        contestId: number;
        members: { handle: string }[];
        participantType: string;
        ghost: boolean;
        startTimeSeconds?: number;
    };
    programmingLanguage: string;
    verdict: string; // OK, WRONG_ANSWER, etc.
    testset: string;
    passedTestCount: number;
    timeConsumedMillis: number;
    memoryConsumedBytes: number;
}

export function extractUsername(profileUrl: string, platform: string): string | null {
    if (!profileUrl) return null;

    try {
        if (!profileUrl.includes('/') && !profileUrl.includes('codeforces.com')) {
            return profileUrl.trim();
        }

        const url = new URL(profileUrl.includes('://') ? profileUrl : `https://${profileUrl}`);
        const parts = url.pathname.split('/').filter(Boolean);

        if (platform === 'codeforces') {
            const profileIndex = parts.indexOf('profile');
            if (profileIndex !== -1 && parts[profileIndex + 1]) {
                return parts[profileIndex + 1];
            }
            if (parts.length > 0) return parts[parts.length - 1];
        }

        return parts[parts.length - 1] || null;
    } catch {
        return profileUrl.trim();
    }
}

export async function scrapeCodeforces(username: string): Promise<CodeforcesData | null> {
    try {
        const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
        const data = await response.json();

        if (data.status === 'OK' && data.result && data.result[0]) {
            const user = data.result[0];
            return {
                handle: user.handle,
                rating: user.rating || 0,
                maxRating: user.maxRating || 0,
                rank: user.rank || 'unrated',
                maxRank: user.maxRank || 'unrated',
                contribution: user.contribution || 0,
                friendOfCount: user.friendOfCount || 0,
                lastOnlineTimeSeconds: user.lastOnlineTimeSeconds,
                registrationTimeSeconds: user.registrationTimeSeconds,
                lastUpdated: new Date().toISOString()
            };
        }
        return null;
    } catch (error) {
        console.error('Codeforces API error:', error);
        return null;
    }
}

function getSignedUrl(method: string, params: Record<string, string | number>): string {
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Check key availability
    const API_KEY = process.env.CF_API_KEY;
    const API_SECRET = process.env.CF_API_SECRET;

    if (!API_KEY || !API_SECRET) {
        return '';
    }

    // Parameters including apiKey and time
    const allParams = { ...params, apiKey: API_KEY, time };

    // Sort keys alphabetically
    const keys = Object.keys(allParams).sort();

    // Construct sorted query string
    const sortedParams = keys.map(key => `${key}=${allParams[key]}`).join('&');

    // Signature Base: rand/methodName?param1=value1...#secret
    const signatureText = `${rand}/${method}?${sortedParams}#${API_SECRET}`;

    // Hash
    const apiSig = crypto.createHash('sha512').update(signatureText).digest('hex');

    // Final URL with apiSig appended
    return `https://codeforces.com/api/${method}?${sortedParams}&apiSig=${rand}${apiSig}`;
}

export async function fetchContestSubmissions(contestId: string | number, count: number = 500): Promise<CFSubmission[]> {
    const url = getSignedUrl('contest.status', { contestId, from: 1, count });

    if (!url) {
        console.warn('⚠️ CF_API_KEY/SECRET missing. Cannot fetch private submissions from CF.');
        return [];
    }

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK') {
            return data.result as CFSubmission[];
        } else {
            console.error(`CF API Error (${contestId}):`, data.comment);
            return [];
        }
    } catch (e) {
        console.error(`Fetch error (${contestId}):`, e);
        return [];
    }
}
