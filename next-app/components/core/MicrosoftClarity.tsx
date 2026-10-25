'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type ClarityFn = (...args: unknown[]) => void;

/**
 * Microsoft Clarity: click and scroll heatmaps and session recordings of the logged-in dashboard
 * (free, and it runs on Microsoft's servers). The project is set to mask text, so the code editor
 * and the test panel opt out with data-clarity-unmask: a recording then shows what a student typed,
 * pasted and ran while solving, which is how a mentor tells honest solving from copying. Everything
 * else stays masked, and password fields are always masked.
 *
 * Each recording is labelled with the student's internal account id (never name or email) and, on
 * a problem page, the sheet and problem, so recordings can be filtered in the Clarity dashboard.
 *
 * The project id is public, so the site's own id is the default; NEXT_PUBLIC_CLARITY_ID overrides
 * it and an empty value turns Clarity off. Production only, dashboard pages only.
 */
export default function MicrosoftClarity() {
    const pathname = usePathname();
    const { user } = useAuth();
    const id = process.env.NEXT_PUBLIC_CLARITY_ID ?? 'z3cuouixb3';
    const active = process.env.NODE_ENV === 'production' && !!id && /^[a-z0-9]{6,16}$/i.test(id) && !!pathname?.startsWith('/dashboard');

    // Clarity's command queue exists as soon as the tag runs, so commands sent a moment early are kept.
    useEffect(() => {
        if (!active) return;
        const send = (fn: (clarity: ClarityFn) => void) => {
            let tries = 0;
            const timer = setInterval(() => {
                const clarity = (window as unknown as { clarity?: ClarityFn }).clarity;
                if (clarity) { fn(clarity); clearInterval(timer); }
                else if (++tries > 40) clearInterval(timer);
            }, 500);
        };
        if (user?.id) send(clarity => clarity('identify', String(user.id)));
        const match = pathname?.match(/^\/dashboard\/sheets\/([^/]+)\/([^/]+)\/([^/]+)/);
        if (match) {
            send(clarity => {
                clarity('set', 'sheet', `${match[1]}/${match[2]}`);
                clarity('set', 'problem', `${match[2]}/${match[3]}`);
            });
        }
    }, [active, pathname, user?.id]);

    if (!active) return null;
    return (
        <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
        </Script>
    );
}
