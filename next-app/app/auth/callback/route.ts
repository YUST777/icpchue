import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const ALLOWED_REDIRECTS = new Set([
    '/dashboard',
    '/login',
    '/profile',
    '/settings',
]);

function getSafeRedirect(next: string | null): string {
    if (!next) return '/dashboard';
    // Block absolute URLs and protocol-relative URLs
    if (next.startsWith('//') || next.includes('://')) return '/dashboard';
    // Only allow paths that start with / and are in the allow-list
    if (!next.startsWith('/')) return '/dashboard';
    const pathname = next.split('?')[0].split('#')[0];
    if (ALLOWED_REDIRECTS.has(pathname)) return next;
    return '/dashboard';
}

export async function GET(req: NextRequest) {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get('code');
    const next = getSafeRedirect(searchParams.get('next'));

    if (code) {
        const response = NextResponse.redirect(new URL(next, origin));

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

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return response;
        }
    }

    return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin));
}
