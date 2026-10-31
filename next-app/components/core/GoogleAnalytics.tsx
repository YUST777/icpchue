'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!measurementId || !window.gtag || !pathname) return;

    window.gtag('config', measurementId, {
      page_path: `${pathname}${window.location.search}`,
    });
  }, [pathname]);

  if (
    process.env.NODE_ENV !== 'production' ||
    !measurementId ||
    !/^G-[A-Z0-9]+$/i.test(measurementId)
  ) {
    return null;
  }

  return (
    <>
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)}, { send_page_view: false });`}
      </Script>
      <Script
        id="google-analytics"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
    </>
  );
}
