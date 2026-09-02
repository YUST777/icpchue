import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication — redirect to /login if no valid session
const PROTECTED_PREFIXES = ['/dashboard'];

// Routes that authenticated users should NOT see — redirect to /dashboard
const AUTH_ONLY_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next();
    const pathname = request.nextUrl.pathname;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Missing auth configuration must never turn protected pages into public
    // pages. Public routes may continue so the deployment can show a useful
    // error page, while dashboard routes fail closed.
    if (!supabaseUrl || !supabaseKey) {
        if (PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = '/login';
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
        return supabaseResponse;
    }

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

    // ── SERVER-SIDE AUTH GATE ────────────────────────────────
    // This runs on EVERY request in the Edge middleware, BEFORE the page renders.
    // It blocks unauthenticated users from /dashboard/* at the server level.
    let hasValidSession = false;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        hasValidSession = !!user;
    } catch (e) {
        // Auth refresh failed — treat as unauthenticated
        if (e instanceof Error) {
            console.warn('[Middleware] Auth refresh failed:', e.message);
        }
        hasValidSession = false;
    }

    // 1. Protected routes: no session → redirect to /login
    const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));
    if (isProtected && !hasValidSession) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Auth pages: has session → redirect to /dashboard (don't show login to logged-in users)
    const isAuthPage = AUTH_ONLY_PAGES.some(page => pathname === page);
    if (isAuthPage && hasValidSession) {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = '/dashboard';
        return NextResponse.redirect(dashUrl);
    }

    return supabaseResponse;
}
