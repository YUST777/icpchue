'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Microsoft Clarity: click and scroll heatmaps, session recordings, rage-click and dead-click
 * finder. Free, no limit on sessions, and it runs on Microsoft's servers instead of our database.
 *
 * The project id is public (it is visible in any page that loads the tag), so the site's own id is the default; NEXT_PUBLIC_CLARITY_ID overrides it, and an empty value turns it off.
 * Production only. Only the logged-in dashboard is recorded, never login, register or password pages. The code editor is
 * masked with data-clarity-mask, and Clarity masks form fields by default.
 */
export default function MicrosoftClarity() {
    const pathname = usePathname();
    const id = process.env.NEXT_PUBLIC_CLARITY_ID ?? 'z3cuouixb3';
    if (process.env.NODE_ENV !== 'production') return null;
    if (!id || !/^[a-z0-9]{6,16}$/i.test(id)) return null;
    if (!pathname?.startsWith('/dashboard')) return null;
    return (
        <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`}
        </Script>
    );
}
