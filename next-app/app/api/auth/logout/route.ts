import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jokgfcglqqrzfitfnynu.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-Nt-MrEXsytqITnY0GAe9Q_lArPek6x',
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

    await supabase.auth.signOut();

    // Also clear legacy cookies
    response.cookies.set('authToken', '', { maxAge: 0, path: '/' });
    response.cookies.set('token', '', { maxAge: 0, path: '/' });

    return response;
}
