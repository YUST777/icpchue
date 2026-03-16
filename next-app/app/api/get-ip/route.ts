import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    let clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    // If x-forwarded-for contains multiple IPs, take the first one
    if (clientIP && clientIP.includes(',')) {
        clientIP = clientIP.split(',')[0].trim();
    }
    // Remove IPv4 mapped to IPv6 prefix if present
    const cleanIP = clientIP.replace(/^::ffff:/, '');

    return NextResponse.json({ ip: cleanIP });
}
