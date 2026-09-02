/**
 * Verdict Helper Extension v1.1.0 — Background Service Worker
 *
 * Self-contained Codeforces AC verification.
 * ─────────────────────────────────────────────────────────────────────────
 * The icpchue site is now serverless (Vercel). Vercel's datacenter IPs are
 * challenged by Codeforces' Cloudflare, so the server CANNOT read a user's
 * submissions in a PRIVATE group. The browser CAN: it runs on the user's own
 * residential IP and already holds a valid Codeforces session (incl. the
 * cf_clearance cookie the browser earned).
 *
 * So this extension does the read itself:
 *   1. Resolve the logged-in user's OWN handle from their CF session
 *      (NOT from icpchue's DB — we trust the live Codeforces session only).
 *   2. Fetch the LAST 5 submissions for the given problem from the user's
 *      "/my" status page (residential IP + cookies => passes Cloudflare).
 *   3. Parse them in-browser and return just the result (no cookies, no raw
 *      HTML) to the page. The page forwards the found submission to icpchue
 *      to mark the problem solved.
 *
 * Cookies NEVER leave the browser. No local/remote bridge is contacted.
 */

const EXT_VERSION = '1.1.0';

// How many of the user's most-recent submissions (for the problem) to scan.
const SCAN_LAST_N = 5;

// ─── Handle cache ────────────────────────────────────────────────────
let handleCache = {
    handle: null,
    sessionKey: null, // changes when session cookies change
};

function getSessionKey(rawCookies) {
    const sessionCookies = rawCookies
        .filter(c => c.name === 'JSESSIONID' || c.name === '39ce7' || c.name === 'X-User-Sha1')
        .map(c => `${c.name}=${c.value}`)
        .sort()
        .join('|');
    return sessionCookies || null;
}

// Invalidate handle cache when session cookies change (login/logout)
chrome.cookies.onChanged.addListener((changeInfo) => {
    const name = changeInfo.cookie.name;
    if (changeInfo.cookie.domain.includes('codeforces.com') &&
        (name === 'JSESSIONID' || name === '39ce7' || name === 'X-User-Sha1' || name === 'handle')) {
        handleCache.handle = null;
        handleCache.sessionKey = null;
    }
});

// ─── Cookie presence check (we never send cookies anywhere) ──────────
async function getCodeforcesCookies() {
    try {
        const cookies = await chrome.cookies.getAll({ domain: '.codeforces.com' });
        const cookies2 = await chrome.cookies.getAll({ domain: 'codeforces.com' });

        const seen = new Set();
        const all = [];
        for (const c of [...cookies, ...cookies2]) {
            if (!seen.has(c.name)) {
                seen.add(c.name);
                all.push(c);
            }
        }
        return { success: true, raw: all };
    } catch (err) {
        console.error('Cookie read failed:', err);
        return { success: false, error: err.message };
    }
}

// ─── Login Check + handle resolution (from the live CF session only) ──
async function checkLogin() {
    try {
        const cookieResult = await getCodeforcesCookies();
        if (!cookieResult.success) {
            return { loggedIn: false };
        }

        const raw = cookieResult.raw || [];

        // 1. Check handle cookie (fastest path, zero requests)
        const handleCookie = raw.find(c => c.name === 'handle');
        if (handleCookie) {
            handleCache.handle = handleCookie.value;
            handleCache.sessionKey = getSessionKey(raw);
            return { loggedIn: true, handle: handleCookie.value };
        }

        // 2. Check session cookies exist
        const hasSession = raw.some(c =>
            c.name === 'X-User-Sha1' ||
            c.name === '39ce7' ||
            c.name === 'JSESSIONID'
        );

        if (!hasSession) {
            return { loggedIn: false };
        }

        // 3. Session cookies exist but no handle cookie — check cache
        const currentSessionKey = getSessionKey(raw);
        if (handleCache.handle && handleCache.sessionKey === currentSessionKey) {
            return { loggedIn: true, handle: handleCache.handle };
        }

        // 4. Fetch CF homepage ONCE to resolve handle (cached for session)
        try {
            const res = await fetch('https://codeforces.com/', {
                credentials: 'include',
                headers: { 'User-Agent': navigator.userAgent }
            });
            const html = await res.text();

            // The "enter"/"register" links only show when logged OUT.
            const handleMatch = html.match(/personal-sidebar[\s\S]*?href="\/profile\/([^"]+)"/) ||
                                html.match(/href="\/profile\/([^"]+)"[^>]*>\s*<[^>]*lang-[^>]*>/) ||
                                html.match(/href="\/profile\/([^"]+)"/);
            if (handleMatch && handleMatch[1]) {
                handleCache.handle = handleMatch[1];
                handleCache.sessionKey = currentSessionKey;
                return { loggedIn: true, handle: handleMatch[1] };
            }

            if (html.includes('/logout')) {
                return { loggedIn: true, handle: null };
            }
        } catch {
            return { loggedIn: true, handle: null };
        }

        return { loggedIn: true, handle: null };
    } catch {
        return { loggedIn: false };
    }
}

// ─── Submissions URL ─────────────────────────────────────────────────
function getStatusUrl(contestId, urlType, groupId, problemIndex) {
    let base;
    if (urlType === 'gym') {
        base = `https://codeforces.com/gym/${contestId}/my`;
    } else if (urlType === 'group' && groupId) {
        base = `https://codeforces.com/group/${groupId}/contest/${contestId}/my`;
    } else {
        base = `https://codeforces.com/contest/${contestId}/my`;
    }
    if (problemIndex) {
        base += `?problemIndex=${encodeURIComponent(String(problemIndex).toUpperCase())}`;
    }
    return base;
}

// ─── HTML parsing (service worker has no DOMParser, use regex) ───────
function stripTags(s) {
    return s
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseFirstInt(text) {
    const m = String(text || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Parse the Codeforces status datatable rows.
 * Columns (group/contest "/my" view):
 *   [id, when, who, problem, lang, verdict, time, memory]
 */
function parseStatusTable(html) {
    const rows = [];
    const trRe = /<tr[^>]*data-submission-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
    let m;
    while ((m = trRe.exec(html)) !== null) {
        const id = parseInt(m[1], 10);
        const body = m[2];
        const cells = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
        let c;
        while ((c = tdRe.exec(body)) !== null) {
            cells.push(stripTags(c[1]));
        }
        if (cells.length < 6) continue;

        const problemCell = cells[3] || '';
        const langCell = cells[4] || '';
        const verdictCell = cells[5] || '';
        const timeCell = cells[6] || '';
        const memCell = cells[7] || '';

        let problemIndex = null;
        let problemName = null;
        const pm = problemCell.match(/^([A-Za-z][0-9]?)\s*-\s*(.*)$/);
        if (pm) {
            problemIndex = pm[1].toUpperCase();
            problemName = pm[2].trim();
        }

        rows.push({
            id,
            author: (cells[2] || '').trim(),
            problemIndex,
            problemName,
            verdict: verdictCell.trim(),
            timeConsumedMillis: parseFirstInt(timeCell),
            memoryConsumedBytes: parseFirstInt(memCell) * 1024,
            language: langCell.trim(),
        });
    }
    return rows;
}

function isAcceptedVerdict(v) {
    const t = String(v || '').toLowerCase();
    return t === 'accepted' || t === 'ok' || t.startsWith('accepted');
}

/**
 * Fetch the user's last submissions for a problem and find an AC.
 * Runs entirely in the user's browser (residential IP + their CF cookies).
 */
async function getSubmissions({ contestId, problemIndex, urlType, groupId }) {
    // 1. Confirm logged in + resolve the user's OWN handle from CF.
    const login = await checkLogin();
    if (!login.loggedIn) {
        return { success: false, error: 'NOT_LOGGED_IN' };
    }

    // 2. Fetch the status page (CF filters by problemIndex server-side).
    const url = getStatusUrl(contestId, urlType, groupId, problemIndex);
    let html;
    try {
        const res = await fetch(url, {
            credentials: 'include',
            headers: {
                'User-Agent': navigator.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        if (!res.ok) {
            return { success: false, error: `HTTP_${res.status}` };
        }
        html = await res.text();
    } catch (err) {
        return { success: false, error: `FETCH_FAILED: ${err.message}` };
    }

    if (html.includes('<title>Just a moment...</title>')) {
        return { success: false, error: 'CLOUDFLARE_CHALLENGE' };
    }
    if (!html.includes('status-frame-datatable')) {
        if (html.includes('Login into Codeforces') || /\/enter\b/.test(html)) {
            return { success: false, error: 'NOT_LOGGED_IN' };
        }
        return { success: false, error: 'NO_SUBMISSIONS_TABLE' };
    }

    // 3. Parse, keep only this user's rows for this problem, scan the last N.
    const all = parseStatusTable(html);
    const handleLc = (login.handle || '').toLowerCase();
    const wantIdx = problemIndex ? String(problemIndex).toUpperCase() : null;

    let mine = all.filter(r => {
        const byUser = !handleLc || (r.author || '').toLowerCase() === handleLc;
        const byProblem = !wantIdx || (r.problemIndex || '').toUpperCase() === wantIdx;
        return byUser && byProblem;
    });

    // The "/my" page is already newest-first; scan only the last N submissions.
    const recent = mine.slice(0, SCAN_LAST_N);
    const ac = recent.find(r => isAcceptedVerdict(r.verdict));

    return {
        success: true,
        handle: login.handle || null,
        accepted: ac || null,
        scanned: recent.length,
        submissions: recent,
    };
}

// ─── Contest-wide backfill ───────────────────────────────────────────
// Build the paginated "my submissions in this contest" URL.
function getContestMyUrl(contestId, urlType, groupId, page) {
    let base;
    if (urlType === 'gym') {
        base = `https://codeforces.com/gym/${contestId}/my`;
    } else if (urlType === 'group' && groupId) {
        base = `https://codeforces.com/group/${groupId}/contest/${contestId}/my`;
    } else {
        base = `https://codeforces.com/contest/${contestId}/my`;
    }
    return page && page > 1 ? `${base}/page/${page}` : base;
}

/**
 * Fetch ALL of the user's Accepted submissions across a whole contest/sheet
 * (every problem at once), paginating until no new rows. Returns the BEST
 * (first-seen / fastest) AC per problem index.
 *
 * Runs in the user's browser (residential IP + their CF session).
 */
async function getContestSubmissions({ contestId, urlType, groupId, maxPages = 10 }) {
    const login = await checkLogin();
    if (!login.loggedIn) {
        return { success: false, error: 'NOT_LOGGED_IN' };
    }
    const handleLc = (login.handle || '').toLowerCase();

    // problemIndex -> best AC row
    const acByProblem = {};
    const allSubmissions = [];
    let totalRows = 0;
    let pagesRead = 0;

    for (let page = 1; page <= maxPages; page++) {
        const url = getContestMyUrl(contestId, urlType, groupId, page);
        let html;
        try {
            const res = await fetch(url, {
                credentials: 'include',
                headers: {
                    'User-Agent': navigator.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });
            if (!res.ok) {
                // Page beyond the last one can 400/404 — stop gracefully if we
                // already have data, else report the error.
                if (page > 1) break;
                return { success: false, error: `HTTP_${res.status}` };
            }
            html = await res.text();
        } catch (err) {
            if (page > 1) break;
            return { success: false, error: `FETCH_FAILED: ${err.message}` };
        }

        if (html.includes('<title>Just a moment...</title>')) {
            return { success: false, error: 'CLOUDFLARE_CHALLENGE' };
        }
        if (!html.includes('status-frame-datatable')) {
            if (page === 1) {
                if (html.includes('Login into Codeforces') || /\/enter\b/.test(html)) {
                    return { success: false, error: 'NOT_LOGGED_IN' };
                }
                return { success: false, error: 'NO_SUBMISSIONS_TABLE' };
            }
            break; // no more pages
        }

        const rows = parseStatusTable(html).filter(r =>
            !handleLc || (r.author || '').toLowerCase() === handleLc
        );
        if (rows.length === 0) break; // empty page => done

        pagesRead++;
        totalRows += rows.length;

        for (const r of rows) {
            if (!r.problemIndex) continue;
            const key = r.problemIndex.toUpperCase();
            allSubmissions.push({
                problemIndex: key,
                id: r.id,
                verdict: r.verdict,
                timeConsumedMillis: r.timeConsumedMillis || 0,
                memoryConsumedBytes: r.memoryConsumedBytes || 0,
                language: r.language || '',
            });

            if (isAcceptedVerdict(r.verdict)) {
                const prev = acByProblem[key];
                // Keep the fastest AC (or the first one we see).
                if (!prev || (r.timeConsumedMillis || 0) < (prev.timeConsumedMillis || 0)) {
                    acByProblem[key] = r;
                }
            }
        }

        // CF shows 50 rows per page; fewer means this was the last page.
        if (rows.length < 50) break;
    }

    const accepted = Object.entries(acByProblem).map(([problemIndex, r]) => ({
        problemIndex,
        id: r.id,
        verdict: 'Accepted',
        timeConsumedMillis: r.timeConsumedMillis || 0,
        memoryConsumedBytes: r.memoryConsumedBytes || 0,
        language: r.language || '',
    }));

    return {
        success: true,
        handle: login.handle || null,
        contestId: String(contestId),
        accepted,
        submissions: allSubmissions,
        pagesRead,
        totalRows,
    };
}

// ─── Message Handler ─────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

    // NEW: self-contained submissions read (no cookies leave the browser)
    if (message.type === 'GET_CF_SUBMISSIONS') {
        getSubmissions({
            contestId: message.contestId,
            problemIndex: message.problemIndex,
            urlType: message.urlType || 'contest',
            groupId: message.groupId || null,
        }).then(sendResponse).catch(err => {
            sendResponse({ success: false, error: err.message || 'EXTENSION_ERROR' });
        });
        return true;
    }

    // NEW: contest-wide backfill — all ACs across one contest/sheet.
    if (message.type === 'GET_CF_CONTEST_SUBMISSIONS') {
        getContestSubmissions({
            contestId: message.contestId,
            urlType: message.urlType || 'contest',
            groupId: message.groupId || null,
            maxPages: message.maxPages || 10,
        }).then(sendResponse).catch(err => {
            sendResponse({ success: false, error: err.message || 'EXTENSION_ERROR' });
        });
        return true;
    }

    if (message.action === 'ping') {
        sendResponse({ status: 'pong', version: EXT_VERSION });
        return true;
    }
});

console.log(`🧩 Verdict Helper v${EXT_VERSION} loaded (self-contained AC verification, no bridge, no cookie export)`);
