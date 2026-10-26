import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { grantAchievement } from '@/lib/services/achievements';
import { toHandle } from '@/lib/profile/socials';
import { STAR_BADGE_ID, hasStarredRepo } from '@/lib/achievements/github-star';

// GitHub user names: letters, digits and single hyphens, up to 39 characters.
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export async function POST(req: NextRequest) {
    const authUser = await verifyAuth(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = await rateLimit(`claim-star:${authUser.id}`, 8, 600);
    if (!rl.success) return NextResponse.json({ error: 'Too many tries. Wait a few minutes and try again.' }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const login = toHandle(body.username);
    if (!login || !GITHUB_LOGIN.test(login)) {
        return NextResponse.json({ error: 'Enter your GitHub user name, for example YUST777.' }, { status: 400 });
    }

    const held = await query(`SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2`, [authUser.id, STAR_BADGE_ID]);
    if (held.rows.length > 0) return NextResponse.json({ claimed: true, already: true });

    // One GitHub account can back one ICPC HUE account.
    const owner = await query(`SELECT user_id FROM github_star_claims WHERE lower(github_login) = lower($1)`, [login]);
    if (owner.rows.length > 0 && Number(owner.rows[0].user_id) !== Number(authUser.id)) {
        return NextResponse.json({ error: 'That GitHub account is already linked to another member.' }, { status: 409 });
    }

    let starred: boolean;
    try {
        starred = await hasStarredRepo(login);
    } catch {
        return NextResponse.json({ error: 'Could not reach GitHub. Try again in a minute.' }, { status: 502 });
    }
    if (!starred) {
        return NextResponse.json({ error: `We do not see a star from @${login} yet. Star the repo, wait a minute and try again.` }, { status: 404 });
    }

    await query(
        `INSERT INTO github_star_claims (user_id, github_login) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET github_login = EXCLUDED.github_login, claimed_at = NOW()`,
        [authUser.id, login]
    );
    if (!(await grantAchievement(authUser.id, STAR_BADGE_ID))) {
        return NextResponse.json({ error: 'The badge could not be awarded right now.' }, { status: 500 });
    }
    return NextResponse.json({ claimed: true });
}
