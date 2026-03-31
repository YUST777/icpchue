'use client';

import { useEffect } from 'react';

const APP_VERSION = '1.7.0';

/**
 * Handles app version updates.
 * Only clears service worker cache on version change — does NOT wipe localStorage.
 * No hard reload — the new version loads naturally on next navigation.
 */
export default function ClientVersionManager() {
    useEffect(() => {
        const currentVersion = localStorage.getItem('app_version');
        if (currentVersion === APP_VERSION) return;

        // Version changed — update SW cache only
        (async () => {
            // Unregister old service workers so the new one takes over
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                } catch { /* ignore */ }
            }

            // Clear browser cache storage (SW caches)
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                } catch { /* ignore */ }
            }

            // Update version — do NOT clear localStorage, do NOT reload
            localStorage.setItem('app_version', APP_VERSION);
        })();
    }, []);

    return null;
}
