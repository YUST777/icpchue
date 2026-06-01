import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

    // Safe URL check to prevent TypeError: Invalid URL crashes in Edge runtime
    let isValidUrl = false;
    try {
        new URL(supabaseUrl);
        isValidUrl = true;
    } catch {
        // URL is invalid
    }

    if (!isValidUrl) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        );
                        supabaseResponse = NextResponse.next();
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        );
                    } catch {
                        // Ignore cookie mutations errors
                    }
                },
            },
        }
    );

    try {
        let timeoutId: any;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 3000);
        });
        await Promise.race([
            supabase.auth.getUser(),
            timeoutPromise
        ]);
        if (timeoutId) clearTimeout(timeoutId);
    } catch (e) {
        // Auth refresh failed/timed out — continue with stale session rather than hanging
        if (e instanceof Error && e.name !== 'Auth timeout') {
            console.warn('[Middleware] Auth refresh failed:', e.message);
        }
    }

    return supabaseResponse;
}
