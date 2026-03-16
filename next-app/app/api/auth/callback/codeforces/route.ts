import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';

const CLIENT_ID = process.env.NEXT_PUBLIC_CF_CLIENT_ID;
const CLIENT_SECRET = process.env.CF_CLIENT_SECRET;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://icpchue.com';
    const REDIRECT_URI = `${siteUrl}/api/auth/callback/codeforces`;

    if (error) {
        return NextResponse.json({ error: 'OAuth Error', details: Object.fromEntries(searchParams.entries()) }, { status: 400 });
    }

    if (!code || !CLIENT_ID || !CLIENT_SECRET) {
        return NextResponse.json({ error: 'Missing code or credentials' }, { status: 400 });
    }

    try {
        // 1. Exchange Code for Token
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('redirect_uri', REDIRECT_URI);

        const tokenRes = await fetch('https://codeforces.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const tokenText = await tokenRes.text();
        console.log('[Codeforces Callback] Token status:', tokenRes.status, 'Response:', tokenText);

        let tokenData;
        try {
            tokenData = JSON.parse(tokenText);
        } catch {
            return NextResponse.json({ error: 'Invalid response from Codeforces' }, { status: 500 });
        }

        if (tokenData.error || !tokenRes.ok) {
            console.error('[Codeforces Callback] OAuth error:', tokenData);
            return NextResponse.json({ error: 'Codeforces OAuth Error' }, { status: 400 });
        }

        // 2. Extract Handle from ID Token
        const idToken = tokenData.id_token;
        if (!idToken) {
            return NextResponse.json({ error: 'No id_token returned' }, { status: 400 });
        }

        const [, payload] = idToken.split('.');
        const decoded: any = JSON.parse(Buffer.from(payload, 'base64url').toString());
        const handle = decoded?.handle;

        if (!handle) {
            return NextResponse.json({ error: 'No handle found in id_token' }, { status: 400 });
        }

        // 3. Check if user is logged in
        const authUser = await verifyAuth(req);
        console.log('[Codeforces Callback] User handle:', handle, 'Authenticated user:', authUser?.id);

        if (authUser) {
            // CASE A: User is already logged in -> LINK ACCOUNT
            await query(
                `UPDATE users 
                 SET codeforces_handle = $1, 
                     codeforces_access_token = $2, 
                     codeforces_refresh_token = $3
                 WHERE id = $4`,
                [handle, tokenData.access_token, tokenData.refresh_token, authUser.id]
            );
            console.log('[Codeforces Callback] User linked successfully');

            // Sync to applications table if linked
            if (authUser.applicationId) {
                await query(
                    `UPDATE applications SET codeforces_profile = $1 WHERE id = $2`,
                    [handle, authUser.applicationId]
                );
            }

            // Perform initial scrape to show stats immediately
            try {
                const { scrapeCodeforces } = await import('@/lib/codeforces');
                const codeforcesData = await scrapeCodeforces(handle);
                if (codeforcesData) {
                    await query(
                        'UPDATE users SET codeforces_data = $1 WHERE id = $2',
                        [JSON.stringify(codeforcesData), authUser.id]
                    );
                }
            } catch (scrapeError) {
                console.error('[Codeforces Callback] Initial scrape failed:', scrapeError);
            }

            // Invalidate profile cache
            const { invalidateCache } = await import('@/lib/cache');
            await invalidateCache(`user:${authUser.id}:profile`);
            await invalidateCache(`user:${authUser.id}:dashboard_stats`);
            await invalidateCache(`user:${authUser.id}:roadmap`);
            await invalidateCache(`user:${authUser.id}:curriculum_progress`);
            await invalidateCache('leaderboard:codeforces');
            await invalidateCache('leaderboard:sheets:public');

            const completionUrl = new URL('/dashboard/profile', siteUrl);
            return NextResponse.redirect(completionUrl);
        } else {
            // CASE B: User is NOT logged in -> ATTEMPT SIGN IN via Codeforces handle
            const result = await query(
                `SELECT id, supabase_uid, role FROM users WHERE codeforces_handle = $1 LIMIT 1`,
                [handle]
            );

            const user = result.rows[0];

            if (user && user.supabase_uid) {
                // Get auth user's email to create a session
                const adminClient = createAdminClient();
                const { data: authUserData } = await adminClient.auth.admin.getUserById(user.supabase_uid);

                if (authUserData?.user?.email) {
                    // Generate a magic link to sign the user in
                    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                        type: 'magiclink',
                        email: authUserData.user.email,
                    });

                    if (!linkError && linkData?.properties?.hashed_token) {
                        // Use the token to create a session
                        const response = NextResponse.redirect(new URL('/dashboard', siteUrl));
                        const supabase = createServerClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                            {
                                cookies: {
                                    getAll() {
                                        return req.cookies.getAll();
                                    },
                                    setAll(cookiesToSet) {
                                        cookiesToSet.forEach(({ name, value, options }) =>
                                            response.cookies.set(name, value, options)
                                        );
                                    },
                                },
                            }
                        );

                        const { error: verifyError } = await supabase.auth.verifyOtp({
                            token_hash: linkData.properties.hashed_token,
                            type: 'magiclink',
                        });

                        if (!verifyError) {
                            return response;
                        }
                    }
                }

                // Fallback: redirect to login
                const loginUrl = new URL('/login', siteUrl);
                loginUrl.searchParams.set('info', 'cf_linked');
                loginUrl.searchParams.set('handle', handle);
                return NextResponse.redirect(loginUrl);
            } else {
                const loginUrl = new URL('/login', siteUrl);
                loginUrl.searchParams.set('error', 'cf_not_linked');
                loginUrl.searchParams.set('handle', handle);
                return NextResponse.redirect(loginUrl);
            }
        }

    } catch (e: any) {
        console.error('[Codeforces Callback Error]:', e);
        return NextResponse.json({ error: 'Authentication failed', details: e.message }, { status: 500 });
    }
}
