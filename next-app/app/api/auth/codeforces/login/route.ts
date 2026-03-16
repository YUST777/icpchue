import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.NEXT_PUBLIC_CF_CLIENT_ID;


export async function GET(req: NextRequest) {
    if (!CLIENT_ID) {
        return NextResponse.json({ error: 'Missing Codeforces Client ID' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://icpchue.com';
    const REDIRECT_URI = `${siteUrl}/api/auth/callback/codeforces`;

    const scope = 'openid profile'; // Trying icpczagazig's successful scopes
    const state = Math.random().toString(36).substring(7); // Simple state for now

    const authUrl = `https://codeforces.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${state}`;
    console.log('[Codeforces Login] Redirecting to:', authUrl);

    return NextResponse.redirect(authUrl);
}
