'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jokgfcglqqrzfitfnynu.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-Nt-MrEXsytqITnY0GAe9Q_lArPek6x';

    return createBrowserClient(
        supabaseUrl,
        supabaseKey
    );
}
