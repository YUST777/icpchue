import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/cache/rate-limit';
import { createServerClient } from '@supabase/ssr';
import { query } from '@/lib/db/db';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const limitResult = await rateLimit(`login:${ip}`, 5, 60);

        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many login attempts. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const response = NextResponse.json({ success: true }, { status: 200 });

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

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        });

        if (error || !data.user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const userResult = await query(
            'SELECT id, application_id FROM users WHERE supabase_uid = $1',
            [data.user.id]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const user = userResult.rows[0];

        query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]).catch(() => {});
        const userAgent = req.headers.get('user-agent') || 'unknown';
        query('INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES ($1, $2, $3)', [user.id, ip, userAgent])
            .catch(() => {});

        return NextResponse.json(
            { success: true, user: { id: user.id, email: normalizedEmail } },
            { status: 200, headers: response.headers }
        );

    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
