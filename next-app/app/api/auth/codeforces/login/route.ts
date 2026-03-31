import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CLIENT_ID = process.env.NEXT_PUBLIC_CF_CLIENT_ID;

export async function GET(req: NextRequest) {
    if (!CLIENT_ID) {
        return NextResponse.json({ error: 'Missing Codeforces Client ID' }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://icpchue.com';
    const REDIRECT_URI = `${siteUrl}/api/auth/callback/codeforces`;

    const scope = 'openid profile';
    // Cryptographically secure state parameter to prevent CSRF
    const state = crypto.randomBytes(32).toString('hex');

    const authUrl = `https://codeforces.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${state}`;

    const response = NextResponse.redirect(authUrl);
    // Store state in a secure, httpOnly cookie for validation in the callback
    response.cookies.set('cf_oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/api/auth/callback/codeforces',
    });

    return response;
}
