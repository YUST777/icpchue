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

// ─── Codeforces Verification Helper ──────────────────────────────────
async function verifySubmissionViaExtension(contestId, problemIndex, handle) {
    try {
        console.log(`[Verify Extension] Starting verification for contest: ${contestId}, problem: ${problemIndex}, handle: ${handle}`);
        
        // 1. Try contest.status API endpoint (uses active group membership cookies automatically)
        let cfRes;
        try {
            cfRes = await fetch(`https://codeforces.com/api/contest.status?contestId=${contestId}&from=1&count=200`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
        } catch (fetchErr) {
            console.error('[Verify Extension] Fetch to contest.status failed:', fetchErr);
        }

        let data;
        if (cfRes && cfRes.ok) {
            data = await cfRes.json();
        }

        let match;
        if (data && data.status === 'OK' && Array.isArray(data.result)) {
            match = data.result.find(sub => {
                const isProblemMatch = sub.problem?.index?.toUpperCase() === problemIndex.toUpperCase();
                const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
                const isUserMatch = sub.author?.members?.some(m => m.handle?.toLowerCase() === handle.toLowerCase());
                return isProblemMatch && isAccepted && isUserMatch;
            });
        }

        // 2. Fall back to user.status API endpoint
        if (!match) {
            console.log('[Verify Extension] Match not found in contest.status. Trying user.status...');
            const userRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=60`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                if (userData.status === 'OK' && Array.isArray(userData.result)) {
                    match = userData.result.find(sub => {
                        const isContestMatch = Number(sub.contestId) === Number(contestId);
                        const isProblemMatch = sub.problem?.index?.toUpperCase() === problemIndex.toUpperCase();
                        const isAccepted = sub.verdict === 'OK' || sub.verdict?.toUpperCase() === 'ACCEPTED';
                        return isContestMatch && isProblemMatch && isAccepted;
                    });
                }
            }
        }

        if (match) {
            console.log('[Verify Extension] Match found!', match.id);
            return {
                success: true,
                submissionId: match.id,
                timeMs: match.timeConsumedMillis || 0,
                memoryKb: Math.round((match.memoryConsumedBytes || 0) / 1024)
            };
        }

        return {
            success: false,
            error: `No Accepted (AC) submission found on Codeforces for handle "${handle}" and problem ${contestId}${problemIndex}. Please make sure you have submitted the code and it has passed all test cases.`
        };

    } catch (err) {
        console.error('[Verify Extension] Error:', err);
        return { success: false, error: `Extension verification error: ${err.message}` };
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

    if (message.type === 'VERDICT_VERIFY_CF_BACKGROUND') {
        verifySubmissionViaExtension(message.payload.contestId, message.payload.problemIndex, message.payload.cfHandle)
            .then(sendResponse);
        return true;
    }

    // Legacy ping support
    if (message.action === 'ping') {
        sendResponse({ status: 'pong', version: '1.0.8' });
        return true;
    }
});

console.log('🧩 Verdict Helper Extension v1.0.8 loaded (cookie-based)');
