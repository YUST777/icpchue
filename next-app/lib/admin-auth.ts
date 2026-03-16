import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOTP_SECRET = process.env.TOTP_SECRET;
const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN;

/**
 * Validates admin requests using 3 layers of security:
 * 1. Secret Token (Header)
 * 2. Basic Auth (Username/Password)
 * 3. TOTP (Appended to password)
 */
export async function validateAdminRequest(req: NextRequest): Promise<NextResponse | null> {

    // 1. Check strict environment configuration
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !TOTP_SECRET || !ADMIN_SECRET_TOKEN) {
        console.error('❌ ERROR: Admin environment variables not fully configured');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Validate Secret Token
    const userAgent = req.headers.get('user-agent');
    const acceptHeader = req.headers.get('accept');

    // Anti-bot check
    if (!userAgent || (!acceptHeader && !req.headers.get('x-requested-with'))) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const token = req.headers.get('x-admin-token') || req.headers.get('admin-token');
    if (!token || token !== ADMIN_SECRET_TOKEN) {
        // Fallback check for query param (legacy support)
        const url = new URL(req.url);
        const queryToken = url.searchParams.get('token');
        if (queryToken !== ADMIN_SECRET_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
        }
    }

    // 3. Basic Auth & TOTP
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new NextResponse('Authentication required', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="ICPC Hue Admin - Requires Password + Google Authenticator Code"' }
        });
    }

    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, ...passwordParts] = credentials.split(':');
        const passwordInput = passwordParts.join(':');

        // Check Username
        if (username !== ADMIN_USERNAME) {
            return new NextResponse('Invalid credentials', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="ICPC Hue Admin"' } });
        }

        // Parse Password and TOTP
        // Format: "password,totpcode"
        let password = passwordInput;
        let totpCode = null;

        if (passwordInput.includes(',')) {
            const parts = passwordInput.split(',');
            totpCode = parts[parts.length - 1].trim();
            password = parts.slice(0, -1).join(',');
        }

        // Check Password
        if (password !== ADMIN_PASSWORD) {
            return new NextResponse('Invalid credentials', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="ICPC Hue Admin"' } });
        }

        // Check TOTP
        if (!totpCode) {
            return new NextResponse('Google Authenticator code required. Format: password,6digitcode', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="ICPC Hue Admin"' }
            });
        }

        const totpValid = speakeasy.totp.verify({
            secret: TOTP_SECRET,
            encoding: 'base32',
            token: totpCode,
            window: 2 // 60 seconds tolerance
        });

        if (!totpValid) {
            return new NextResponse('Invalid Google Authenticator code', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="ICPC Hue Admin"' }
            });
        }

    } catch (error) {
        console.error('Admin auth error:', error);
        return new NextResponse('Invalid authentication header', { status: 401 });
    }

    // Authentication successful
    return null;
}
