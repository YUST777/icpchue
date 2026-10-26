export const STAR_REPO = 'YUST777/icpchue';
export const STAR_BADGE_ID = 'github-star';

const PER_PAGE = 100;
// A star from a claim made right after starring sits at the top of the list (newest first);
// ten pages covers the 1,000 most recent stars.
const MAX_PAGES = 10;

/**
 * True when the GitHub account has starred the repository. A user's starred list is public,
 * unlike a repo's stargazer list, which GitHub only shows to signed-in callers.
 * GITHUB_TOKEN is optional and only lifts the 60 requests an hour limit.
 */
export async function hasStarredRepo(login: string): Promise<boolean> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'icpchue.com' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}/starred?per_page=${PER_PAGE}&page=${page}`, { headers, cache: 'no-store' });
        if (res.status === 404) return false; // no such GitHub user
        if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
        const rows = (await res.json()) as { full_name?: string }[];
        if (rows.some(r => r.full_name?.toLowerCase() === STAR_REPO.toLowerCase())) return true;
        if (rows.length < PER_PAGE) return false;
    }
    return false;
}
