/**
 * Verdict Helper Extension v1.0.8 — Background Service Worker
 *
 * Cookie-based approach: extracts CF cookies + CSRF for server-side submission.
 * No more tab automation / Puppeteer — Cloudflare can't block us.
 */

// ─── Cookie Extraction ───────────────────────────────────────────────
async function getCodeforcesCookies() {
    try {
        const cookies = await chrome.cookies.getAll({ domain: '.codeforces.com' });
        // Also grab cookies without the dot prefix
        const cookies2 = await chrome.cookies.getAll({ domain: 'codeforces.com' });

        // Deduplicate by name
        const seen = new Set();
        const all = [];
        for (const c of [...cookies, ...cookies2]) {
            if (!seen.has(c.name)) {
                seen.add(c.name);
                all.push(c);
            }
        }

        const cookieString = all.map(c => `${c.name}=${c.value}`).join('; ');
        return { success: true, cookies: cookieString, raw: all };
    } catch (err) {
        console.error('Cookie extraction failed:', err);
        return { success: false, error: err.message };
    }
}

// ─── CSRF Token Extraction ───────────────────────────────────────────
async function fetchCsrfToken(submitUrl) {
    try {
        const res = await fetch(submitUrl, {
            credentials: 'include',
            headers: {
                'User-Agent': navigator.userAgent,
                'Accept': 'text/html'
            }
        });
        const html = await res.text();

        // Extract csrf_token from hidden input
        const match = html.match(/name=['"]csrf_token['"][^>]*value=['"]([^'"]+)['"]/);
        if (match && match[1]) {
            return { success: true, csrfToken: match[1] };
        }

        // Fallback: look for it in a meta tag or JS variable
        const metaMatch = html.match(/csrf_token\s*[=:]\s*['"]([a-f0-9]+)['"]/);
        if (metaMatch && metaMatch[1]) {
            return { success: true, csrfToken: metaMatch[1] };
        }

        // Check if we got redirected to login
        if (html.includes('handleOrEmail') || html.includes('/enter')) {
            return { success: false, error: 'NOT_LOGGED_IN' };
        }

        return { success: false, error: 'CSRF token not found in page' };
    } catch (err) {
        return { success: false, error: `Failed to fetch CSRF: ${err.message}` };
    }
}

// ─── Login Check ─────────────────────────────────────────────────────
async function checkLogin() {
    try {
        const cookieResult = await getCodeforcesCookies();
        if (!cookieResult.success) {
            return { loggedIn: false };
        }

        const raw = cookieResult.raw || [];

        // Shortcut: CF stores the handle in a cookie
        const handleCookie = raw.find(c => c.name === 'handle');
        if (handleCookie) {
            return { loggedIn: true, handle: handleCookie.value };
        }

        // Check for session cookies that indicate login
        const hasSession = raw.some(c =>
            c.name === 'X-User-Sha1' ||
            c.name === '39ce7' ||
            c.name === 'JSESSIONID'
        );

        if (!hasSession) {
            return { loggedIn: false };
        }

        // If we have session cookies but no handle cookie, try fetching the page
        try {
            const res = await fetch('https://codeforces.com/', {
                credentials: 'include',
                headers: { 'User-Agent': navigator.userAgent }
            });
            const html = await res.text();

            const handleMatch = html.match(/href="\/profile\/([^"]+)"/);
            if (handleMatch && handleMatch[1]) {
                return { loggedIn: true, handle: handleMatch[1] };
            }

            // Check if logged in by looking for logout link
            if (html.includes('/logout')) {
                return { loggedIn: true, handle: null };
            }
        } catch {
            // Network fail — assume logged in if session cookies exist
        }

        return { loggedIn: true, handle: null };
    } catch {
        return { loggedIn: false };
    }
}

// ─── Message Handler ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CF_COOKIES') {
        getCodeforcesCookies().then(sendResponse);
        return true;
    }

    if (message.type === 'GET_CSRF_TOKEN') {
        fetchCsrfToken(message.submitUrl).then(sendResponse);
        return true;
    }

    if (message.type === 'CHECK_CF_LOGIN' || message.action === 'checkLoginStatus') {
        checkLogin().then(sendResponse);
        return true;
    }

    if (message.type === 'GET_CF_HANDLE') {
        checkLogin().then(result => {
            sendResponse({ handle: result.handle || null });
        });
        return true;
    }

    // Legacy ping support
    if (message.action === 'ping') {
        sendResponse({ status: 'pong', version: '1.0.8' });
        return true;
    }
});

console.log('🧩 Verdict Helper Extension v1.0.8 loaded (cookie-based)');
