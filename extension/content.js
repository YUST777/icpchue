/**
 * Verdict Helper Extension v1.1.0 — Content Script
 *
 * Bridges window.postMessage (from the icpchue page) ↔ chrome.runtime.sendMessage
 * (to the background service worker). Also injects a marker element so the page
 * knows the extension is installed.
 *
 * v1.1.0: the extension reads the user's submissions itself (from their own
 * browser/IP) and returns only the result — cookies never leave the browser and
 * no local/remote bridge is contacted.
 */

// ─── Inject marker ──────────────────────────────────────────────────
(() => {
    const marker = document.createElement('div');
    marker.id = 'verdict-extension-installed';
    marker.setAttribute('data-version', '1.1.0');
    marker.style.display = 'none';
    document.documentElement.appendChild(marker);
})();

// ─── Message Listener ────────────────────────────────────────────────
window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const { type, payload } = event.data || {};

    // ── Check Login ──
    if (type === 'VERDICT_CHECK_LOGIN') {
        try {
            const result = await chrome.runtime.sendMessage({ type: 'CHECK_CF_LOGIN' });
            window.postMessage({
                type: 'VERDICT_LOGIN_STATUS',
                loggedIn: result.loggedIn,
                handle: result.handle || null
            }, '*');
        } catch {
            window.postMessage({ type: 'VERDICT_LOGIN_STATUS', loggedIn: false }, '*');
        }
    }

    // ── Get Handle (resolved from the live Codeforces session) ──
    if (type === 'VERDICT_GET_HANDLE') {
        try {
            const result = await chrome.runtime.sendMessage({ type: 'GET_CF_HANDLE' });
            window.postMessage({
                type: 'VERDICT_HANDLE_RESPONSE',
                handle: result.handle || null
            }, '*');
        } catch {
            window.postMessage({ type: 'VERDICT_HANDLE_RESPONSE', handle: null }, '*');
        }
    }

    // ── Get Submissions (self-contained AC check) ──
    // Reads the user's last submissions for a problem in-browser and returns
    // the found AC (if any). No cookies are sent to the page.
    if (type === 'VERDICT_GET_SUBMISSIONS') {
        try {
            const { contestId, problemIndex, urlType, groupId } = payload || {};
            const result = await chrome.runtime.sendMessage({
                type: 'GET_CF_SUBMISSIONS',
                contestId,
                problemIndex,
                urlType,
                groupId
            });
            window.postMessage({
                type: 'VERDICT_SUBMISSIONS_RESULT',
                ...result
            }, '*');
        } catch (err) {
            window.postMessage({
                type: 'VERDICT_SUBMISSIONS_RESULT',
                success: false,
                error: err.message || 'Extension error'
            }, '*');
        }
    }

    // ── Get Contest Submissions (backfill) ──
    // Reads ALL of the user's Accepted submissions across one whole contest/
    // sheet (every problem, paginated) and returns them. Used by the Settings
    // "backfill" button to recover unmarked progress. No cookies leave the
    // browser. A requestId echoes back so the page can correlate many contests.
    if (type === 'VERDICT_GET_CONTEST_SUBMISSIONS') {
        const requestId = (payload && payload.requestId) || null;
        try {
            const { contestId, urlType, groupId, maxPages } = payload || {};
            const result = await chrome.runtime.sendMessage({
                type: 'GET_CF_CONTEST_SUBMISSIONS',
                contestId,
                urlType,
                groupId,
                maxPages
            });
            window.postMessage({
                type: 'VERDICT_CONTEST_SUBMISSIONS_RESULT',
                requestId,
                ...result
            }, '*');
        } catch (err) {
            window.postMessage({
                type: 'VERDICT_CONTEST_SUBMISSIONS_RESULT',
                requestId,
                success: false,
                error: err.message || 'Extension error'
            }, '*');
        }
    }
});
