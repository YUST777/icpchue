/**
 * Verdict Helper Extension v1.3.3 — Background Service Worker
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
 *   2. Fetch the complete paginated submission history for the given problem
 *      from the user's "/my" status page (residential IP + cookies => passes
 *      Cloudflare).
 *   3. Parse it in-browser and return only structured submission rows (no
 *      cookies, no raw HTML). The page imports every attempt so mentors see
 *      accurate tries, while an AC still marks the problem solved.
 *
 * Cookies NEVER leave the browser. No local/remote bridge is contacted.
 */

const EXT_VERSION = '1.3.3';

// A Codeforces status page contains at most 50 rows. This cap supports up to
// 2,500 attempts for one problem while preventing an accidental infinite scan.
const MAX_PROBLEM_HISTORY_PAGES = 50;
const CF_FETCH_TIMEOUT_MS = 12_000;
const VERIFIED_SESSION_CACHE_MS = 60_000;

// ─── Handle cache ────────────────────────────────────────────────────
let handleCache = {
    handle: null,
    sessionKey: null, // changes when session cookies change
    verifiedAt: 0,
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
        handleCache.verifiedAt = 0;
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
async function checkLogin(allowRecentVerification = false) {
    try {
        const cookieResult = await getCodeforcesCookies();
        if (!cookieResult.success) {
            handleCache.handle = null;
            handleCache.sessionKey = null;
            handleCache.verifiedAt = 0;
            return { loggedIn: false };
        }

        const raw = cookieResult.raw || [];
        const currentSessionKey = getSessionKey(raw);

        // A backfill sends one extension message per contest. Reuse a session
        // that the extension verified moments ago so dozens of sheets do not
        // each fetch the homepage. Popup/account checks never use this path,
        // and each status page still rejects a logged-out session.
        if (allowRecentVerification && currentSessionKey && handleCache.handle &&
            handleCache.sessionKey === currentSessionKey &&
            Date.now() - handleCache.verifiedAt < VERIFIED_SESSION_CACHE_MS) {
            return { loggedIn: true, handle: handleCache.handle };
        }

        // Never trust the `handle` cookie by itself. Codeforces can leave it
        // behind after logout, which would make the extension report the old
        // account and potentially try to sync the wrong session.
        // Verify the live homepage on every status check instead.
        try {
            const res = await fetchWithTimeout('https://codeforces.com/', {
                credentials: 'include',
                redirect: 'follow',
                headers: {
                    'User-Agent': navigator.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            }, CF_FETCH_TIMEOUT_MS);
            const html = await res.text();

            const redirectedToLogin = /\/enter(?:[/?#]|$)|\/register(?:[/?#]|$)/i.test(res.url || '');
            const hasLogoutLink = /(?:href|action)=["'][^"']*\/logout(?:[/?#"']|$)/i.test(html) ||
                />\s*Logout\s*</i.test(html);
            const hasLoginMarker = /Login into Codeforces|href=["'][^"']*\/(?:enter|register)(?:[/?#"'])/i.test(html);
            // Prefer the profile link inside Codeforces' personal sidebar so
            // a logged-in homepage cannot accidentally resolve a handle from
            // a recent-contest/standings link elsewhere in the document.
            const handleMatch = html.match(/personal-sidebar[\s\S]*?href=["']\/profile\/([A-Za-z0-9_.-]{1,64})(?:["'?#])/i) ||
                html.match(/href=["']\/profile\/([A-Za-z0-9_.-]{1,64})(?:["'?#])/i);

            // A live logged-in page must contain both the authenticated
            // navigation marker and a profile handle. Any redirect, login
            // page, challenge, or incomplete response fails closed.
            if (res.ok && !redirectedToLogin && hasLogoutLink && !hasLoginMarker && handleMatch?.[1]) {
                const handle = handleMatch[1];
                handleCache.handle = handle;
                handleCache.sessionKey = currentSessionKey;
                handleCache.verifiedAt = Date.now();
                return { loggedIn: true, handle };
            }
        } catch {
            // Network failures must not fall back to a stale cookie/cache.
        }

        handleCache.handle = null;
        handleCache.sessionKey = null;
        handleCache.verifiedAt = 0;
        return { loggedIn: false };
    } catch {
        handleCache.handle = null;
        handleCache.sessionKey = null;
        handleCache.verifiedAt = 0;
        return { loggedIn: false };
    }
}

// ─── Submissions URL ─────────────────────────────────────────────────
function getStatusUrl(contestId, urlType, groupId, problemIndex, page = 1) {
    let base;
    if (urlType === 'gym') {
        base = `https://codeforces.com/gym/${contestId}/my`;
    } else if (urlType === 'group' && groupId) {
        base = `https://codeforces.com/group/${groupId}/contest/${contestId}/my`;
    } else {
        base = `https://codeforces.com/contest/${contestId}/my`;
    }
    if (page > 1) base += `/page/${page}`;
    if (problemIndex) base += `?problemIndex=${encodeURIComponent(String(problemIndex).toUpperCase())}`;
    return base;
}

function getSubmissionUrl(contestId, urlType, groupId, submissionId) {
    if (urlType === 'gym') return `https://codeforces.com/gym/${contestId}/submission/${submissionId}`;
    if (urlType === 'group' && groupId) return `https://codeforces.com/group/${groupId}/contest/${contestId}/submission/${submissionId}`;
    return `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CF_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function fetchSubmissionSource({ contestId, urlType, groupId, submissionId }) {
    if (!Number.isSafeInteger(Number(submissionId)) || Number(submissionId) <= 0) {
        return { success: false, error: 'INVALID_SUBMISSION_ID' };
    }
    try {
        const res = await fetchWithTimeout(getSubmissionUrl(contestId, urlType, groupId, submissionId), {
            credentials: 'include',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        if (!res.ok) return { success: false, error: `HTTP_${res.status}` };
        const html = await res.text();
        if (html.includes('<title>Just a moment...</title>')) return { success: false, error: 'CLOUDFLARE_CHALLENGE' };
        if (html.includes('Login into Codeforces') || /\/enter\b/.test(res.url)) {
            return { success: false, error: 'NOT_LOGGED_IN' };
        }
        const sourceCode = parseSourceCode(html);
        return sourceCode ? { success: true, sourceCode } : { success: false, error: 'SOURCE_NOT_AVAILABLE' };
    } catch (err) {
        return { success: false, error: err.name === 'AbortError' ? 'FETCH_TIMEOUT' : (err.message || 'FETCH_FAILED') };
    }
}

async function getSubmissionSource(params) {
    const login = await checkLogin(true);
    if (!login.loggedIn) return { success: false, error: 'NOT_LOGGED_IN' };
    return fetchSubmissionSource(params);
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

function decodeHtml(s) {
    return String(s || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function parseSourceCode(html) {
    const match = html.match(/<pre\b(?=[^>]*\bid=["']program-source-text["'])[^>]*>([\s\S]*?)<\/pre>/i) ||
        html.match(/<pre\b(?=[^>]*\bclass=["'][^"']*program-source[^"']*["'])[^>]*>([\s\S]*?)<\/pre>/i);
    if (!match) return null;
    const source = decodeHtml(match[1]).replace(/\r\n/g, '\n');
    return source ? source.slice(0, 64 * 1024) : null;
}

function parseFirstInt(text) {
    const m = String(text || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

function parseSubmissionTime(body, visibleWhen = '') {
    // Codeforces renders the absolute submission time in a title/data-time
    // attribute even when the visible value is relative ("2 hours ago").
    const attrs = body.matchAll(/(?:data-time|data-timestamp|data-livestamp|title)=["']([^"']+)["']/gi);
    for (const attr of attrs) {
        const raw = attr[1];
        const numeric = Number(raw);
        // Ignore unrelated title attributes such as "View source".
        if (Number.isFinite(numeric) && numeric > 1_000_000_000) {
            return numeric > 4102444800 ? Math.floor(numeric / 1000) : Math.floor(numeric);
        }
        const parsed = Date.parse(raw);
        if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
    }

    // Some Codeforces layouts put the absolute date only in the visible
    // second column (for example "Sep/07/2026 17:18") and use no title/data
    // attribute. Parse that cell as a fallback so imported rows never become
    // NULL timestamps (which the UI renders as 1/1/1970).
    const visible = String(visibleWhen || '').replace(/\s+/g, ' ').trim();
    const visibleDate = Date.parse(visible);
    if (!Number.isNaN(visibleDate)) return Math.floor(visibleDate / 1000);
    return null;
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
            creationTimeSeconds: parseSubmissionTime(body, cells[1]),
        });
    }
    return rows;
}

function isAcceptedVerdict(v) {
    const t = String(v || '').toLowerCase();
    return t === 'accepted' || t === 'ok' || t.startsWith('accepted');
}

/**
 * Fetch the user's complete submission history for a problem and find an AC.
 * Runs entirely in the user's browser (residential IP + their CF cookies).
 */
async function getSubmissions({ contestId, problemIndex, urlType, groupId }) {
    // 1. Confirm logged in + resolve the user's OWN handle from CF.
    const login = await checkLogin(true);
    if (!login.loggedIn) {
        return { success: false, error: 'NOT_LOGGED_IN' };
    }

    // 2. Fetch every page. Codeforces applies problemIndex server-side, so
    // this scans one problem's history instead of the entire contest history.
    const handleLc = (login.handle || '').toLowerCase();
    const wantIdx = problemIndex ? String(problemIndex).toUpperCase() : null;
    const byId = new Map();
    let pagesRead = 0;

    for (let page = 1; page <= MAX_PROBLEM_HISTORY_PAGES; page++) {
        const url = getStatusUrl(contestId, urlType, groupId, problemIndex, page);
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
            break;
        }

        const allRows = parseStatusTable(html);
        const pageRows = allRows.filter(r => {
            const byUser = !handleLc || (r.author || '').toLowerCase() === handleLc;
            const byProblem = !wantIdx || (r.problemIndex || '').toUpperCase() === wantIdx;
            return byUser && byProblem;
        });
        if (allRows.length === 0) break;

        pagesRead++;
        for (const row of pageRows) byId.set(row.id, row);
        if (allRows.length < 50) break;
    }

    // Keep the order deterministic even if Codeforces repeated a row across a
    // page boundary while a new submission was being judged.
    const history = Array.from(byId.values()).sort((a, b) => b.id - a.id);
    // Fetch only the latest source during sync. This keeps a 500-attempt
    // history fast and guarantees the UI can immediately show the last code.
    // Older attempts are still fully tracked by verdict/metadata and their
    // exact source is fetched and persisted when that row is opened.
    const submissions = history;
    if (submissions[0]) {
        const source = await fetchSubmissionSource({ contestId, urlType, groupId, submissionId: submissions[0].id });
        if (source.success && source.sourceCode) submissions[0].sourceCode = source.sourceCode;
    }
    const ac = submissions.find(r => isAcceptedVerdict(r.verdict)) || null;

    return {
        success: true,
        handle: login.handle || null,
        accepted: ac,
        latest: submissions[0] || null,
        scanned: submissions.length,
        submissions,
        pagesRead,
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
 * Fetch ALL of the user's submissions across a whole contest/sheet (every
 * problem at once), paginating until no new rows. Returns the complete verdict
 * history plus the BEST (fastest) AC per problem index.
 *
 * Runs in the user's browser (residential IP + their CF session).
 */
async function getContestSubmissions({ contestId, urlType, groupId, maxPages = 10 }) {
    const login = await checkLogin(true);
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
                creationTimeSeconds: r.creationTimeSeconds || undefined,
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
        creationTimeSeconds: r.creationTimeSeconds || undefined,
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

    if (message.type === 'GET_CF_SUBMISSION_SOURCE') {
        getSubmissionSource({
            contestId: message.contestId,
            urlType: message.urlType || 'contest',
            groupId: message.groupId || null,
            submissionId: message.submissionId,
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
