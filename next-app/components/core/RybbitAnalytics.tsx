import Script from "next/script";

/**
 * Loads Rybbit through the first-party /analytics proxy in next.config.ts.
 * The script is intentionally production-only so local development does not
 * pollute the site's analytics data.
 */
export default function RybbitAnalytics() {
  const host = process.env.NEXT_PUBLIC_RYBBIT_HOST;
  const siteId = process.env.NEXT_PUBLIC_RYBBIT_SITE_ID;

  if (process.env.NODE_ENV !== "production" || !host || !siteId) {
    return null;
  }

  return (
    <Script
      id="rybbit-analytics"
      src={`/analytics/script.js?siteId=${encodeURIComponent(siteId)}`}
      strategy="afterInteractive"
      data-tag="icpchue"
    />
  );
}
