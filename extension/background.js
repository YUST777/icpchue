/**
 * Verdict Helper Extension v1.4.0 — Background Service Worker
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

const EXT_VERSION = '1.4.0';

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

// ─── Status page time parsing ───────────────────────────────────────
// The "When" cell is plain text in the Codeforces account's display
// timezone (Moscow, UTC+3, unless the user changed it). The page states
// that offset next to the server time ("…UTC+3"). Never use the browser's
// timezone: a Cairo or US browser would shift every timestamp.
const CF_MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const DEFAULT_CF_OFFSET_MINUTES = 180;

function parseCfOffsetMinutes(html) {
    const m = String(html || '').match(/UTC\s*([+-])\s*(\d{1,2})(?::(\d{2}))?/);
    if (!m) return DEFAULT_CF_OFFSET_MINUTES;
    const minutes = Number(m[2]) * 60 + Number(m[3] || 0);
    return m[1] === '-' ? -minutes : minutes;
}

function plausibleEpoch(seconds) {
    const now = Date.now() / 1000;
    return Number.isFinite(seconds) && seconds > 1262304000 && seconds < now + 86400 ? Math.floor(seconds) : null;
}

function parseCfDateText(text, offsetMinutes) {
    const t = String(text || '');
    let y, mo, d, h, mi, s;
    let m = t.match(/([A-Za-z]{3})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
        mo = CF_MONTHS[m[1].toLowerCase()];
        if (mo === undefined) return null;
        d = +m[2]; y = +m[3]; h = +m[4]; mi = +m[5]; s = +(m[6] || 0);
    } else {
        m = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (!m) return null;
        d = +m[1]; mo = +m[2] - 1; y = +m[3]; h = +m[4]; mi = +m[5]; s = +(m[6] || 0);
    }
    return plausibleEpoch((Date.UTC(y, mo, d, h, mi, s) - offsetMinutes * 60000) / 1000);
}

function parseSubmissionTime(whenCellHtml, offsetMinutes) {
    const cell = String(whenCellHtml || '');
    // Only look inside the When cell; titles elsewhere in the row (team
    // names, problem names) used to be parsed as dates like 2001-02-01.
    const numeric = cell.match(/data-(?:time|timestamp|livestamp)=["'](\d{9,13})["']/i);
    if (numeric) {
        const n = Number(numeric[1]);
        return plausibleEpoch(n > 4102444800 ? n / 1000 : n);
    }
    const visible = parseCfDateText(stripTags(cell), offsetMinutes);
    if (visible) return visible;
    const title = cell.match(/title=["']([^"']+)["']/i);
    return title ? parseCfDateText(title[1], offsetMinutes) : null;
}

/**
 * Parse the Codeforces status datatable rows.
 * Columns (group/contest "/my" view):
 *   [id, when, who, problem, lang, verdict, time, memory]
 */
function parseStatusTable(html) {
    const rows = [];
    const offsetMinutes = parseCfOffsetMinutes(html);
    const trRe = /<tr[^>]*data-submission-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
    let m;
    while ((m = trRe.exec(html)) !== null) {
        const id = parseInt(m[1], 10);
        const body = m[2];
        const rawCells = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
        let c;
        while ((c = tdRe.exec(body)) !== null) rawCells.push(c[1]);
        if (rawCells.length < 6) continue;
        const cells = rawCells.map(stripTags);

        // Prefer the problem link (handles A1, B2, AA); fall back to the text.
        let problemIndex = null;
        let problemName = null;
        const href = rawCells[3].match(/\/problem\/([A-Za-z0-9]{1,4})(?:["'?#/]|$)/);
        const text = (cells[3] || '').match(/^([A-Za-z][A-Za-z0-9]{0,3})\s*-\s*(.*)$/);
        if (href) problemIndex = href[1].toUpperCase();
        else if (text) problemIndex = text[1].toUpperCase();
        if (text) problemName = text[2].trim();

        rows.push({
            id,
            author: (cells[2] || '').replace(/\s+/g, '').trim(),
            problemIndex,
            problemName,
            verdict: (cells[5] || '').trim(),
            timeConsumedMillis: parseFirstInt((cells[6] || '').replace(/[\s\u00a0\u2009]/g, '')),
            memoryConsumedBytes: parseFirstInt((cells[7] || '').replace(/[\s\u00a0\u2009]/g, '')) * 1024,
            language: (cells[4] || '').trim(),
            creationTimeSeconds: parseSubmissionTime(rawCells[1], offsetMinutes),
        });
    }
    return rows;
}

function isAcceptedVerdict(v) {
    const t = String(v || '').trim().toLowerCase();
    return t === 'accepted' || t === 'ok' || t.startsWith('accepted') ||
        t.startsWith('happy new year') || t.startsWith('perfect result');
}

function isChallengePage(res, html) {
    return /<title>\s*(Just a moment|Attention Required)/i.test(html) ||
        /\/cdn-cgi\/challenge-platform\/|cf_chl_opt|cf-chl-/i.test(html) ||
        ((res.status === 403 || res.status === 503) && /cloudflare/i.test(html));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PAGE_DELAY_MS = 350;

/**
 * Read paginated /my status pages. Stops when a page is short, empty, or adds
 * no new submission ids (Codeforces repeats the last page for out-of-range
 * page numbers). A failure after page 1 is reported as `partial` instead of
 * silently looking like the end of the history.
 */
async function readStatusPages(urlForPage, maxPages) {
    const rows = [];
    const seen = new Set();
    let pagesRead = 0;
    let partial = null;

    for (let page = 1; page <= maxPages; page++) {
        if (page > 1) await sleep(PAGE_DELAY_MS);
        let res;
        let html;
        try {
            res = await fetchWithTimeout(urlForPage(page), {
                credentials: 'include',
                headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
            });
            html = await res.text();
        } catch (err) {
            const error = err && err.name === 'AbortError' ? 'FETCH_TIMEOUT' : `FETCH_FAILED: ${err && err.message}`;
            if (page === 1) return { error };
            partial = error;
            break;
        }

        if (isChallengePage(res, html)) {
            if (page === 1) return { error: 'CLOUDFLARE_CHALLENGE' };
            partial = 'CLOUDFLARE_CHALLENGE';
            break;
        }
        if (!res.ok) {
            if (page === 1) return { error: `HTTP_${res.status}` };
            if (res.status !== 400 && res.status !== 404) partial = `HTTP_${res.status}`;
            break;
        }
        if (!html.includes('status-frame-datatable')) {
            if (page === 1) {
                if (html.includes('Login into Codeforces') || /\/enter(?:[/?#]|$)/.test(res.url || '')) {
                    return { error: 'NOT_LOGGED_IN' };
                }
                return { error: 'NO_SUBMISSIONS_TABLE' };
            }
            break;
        }

        const pageRows = parseStatusTable(html);
        if (pageRows.length === 0) break;
        pagesRead++;
        let added = 0;
        for (const row of pageRows) {
            if (seen.has(row.id)) continue;
            seen.add(row.id);
            rows.push(row);
            added++;
        }
        if (added === 0 || pageRows.length < 50) break;
    }

    return { rows, pagesRead, partial };
}

/**
 * Fetch the user's complete submission history for a problem and find an AC.
 * Runs entirely in the user's browser (residential IP + their CF cookies).
 * "/my" pages only list the logged-in user's own submissions, so rows are
 * not filtered by author (that filter dropped team and legendary-handle rows).
 */
async function getSubmissions({ contestId, problemIndex, urlType, groupId }) {
    const login = await checkLogin(true);
    if (!login.loggedIn) return { success: false, error: 'NOT_LOGGED_IN' };

    const wantIdx = problemIndex ? String(problemIndex).toUpperCase() : null;
    const read = await readStatusPages(
        (page) => getStatusUrl(contestId, urlType, groupId, problemIndex, page),
        MAX_PROBLEM_HISTORY_PAGES
    );
    if (read.error) return { success: false, error: read.error };

    const submissions = read.rows
        .filter(r => !wantIdx || (r.problemIndex || '').toUpperCase() === wantIdx)
        .sort((a, b) => b.id - a.id);
    // Fetch only the latest source during sync; older sources load on demand.
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
        pagesRead: read.pagesRead,
        partial: read.partial,
    };
}

// ─── Contest-wide backfill ───────────────────────────────────────────
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
 * Fetch ALL of the user's submissions across a whole contest/sheet and the
 * fastest AC per problem index.
 */
async function getContestSubmissions({ contestId, urlType, groupId, maxPages = 10 }) {
    const login = await checkLogin(true);
    if (!login.loggedIn) return { success: false, error: 'NOT_LOGGED_IN' };

    const pages = Math.max(1, Math.min(100, Number(maxPages) || 10));
    const read = await readStatusPages((page) => getContestMyUrl(contestId, urlType, groupId, page), pages);
    if (read.error) return { success: false, error: read.error };

    const acByProblem = {};
    const allSubmissions = [];
    let unparsed = 0;
    for (const r of read.rows) {
        if (!r.problemIndex) { unparsed++; continue; }
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
            if (!prev || (r.timeConsumedMillis || 0) < (prev.timeConsumedMillis || 0)) acByProblem[key] = r;
        }
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
        pagesRead: read.pagesRead,
        totalRows: read.rows.length,
        unparsed,
        partial: read.partial,
    };
}

// ─── Message Handler ─────────────────────────────────────────────────
// ─── Pending submit (auto-paste into Codeforces) ─────────────────────
// The site stores the student's code right before opening the Codeforces
// submit tab; the submit page takes it once. Kept in session storage so it
// never touches disk and expires after 10 minutes.
const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_LENGTH = 65536;
const ALLOWED_LANGUAGES = new Set(['c', 'cpp', 'java', 'python', 'kotlin']);

async function storePendingSubmit({ contestId, problemIndex, groupId, code, language }) {
    if (!/^\d+$/.test(String(contestId || '')) || !/^[A-Za-z0-9]{1,4}$/.test(String(problemIndex || ''))) {
        return { success: false, error: 'BAD_PROBLEM' };
    }
    if (typeof code !== 'string' || !code.trim() || code.length > MAX_CODE_LENGTH) {
        return { success: false, error: 'BAD_CODE' };
    }
    const key = `pending:${groupId || ''}:${contestId}:${String(problemIndex).toUpperCase()}`;
    await chrome.storage.session.set({
        [key]: { code, language: ALLOWED_LANGUAGES.has(language) ? language : null, at: Date.now() },
    });
    return { success: true };
}

async function takePendingSubmit(key) {
    const storageKey = `pending:${key}`;
    const stored = (await chrome.storage.session.get(storageKey))[storageKey];
    if (!stored) return { pending: null };
    await chrome.storage.session.remove(storageKey);
    if (Date.now() - stored.at > PENDING_TTL_MS) return { pending: null };
    return { pending: { code: stored.code, language: stored.language } };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PREPARE_SUBMIT') {
        storePendingSubmit(message).then(sendResponse).catch(() => sendResponse({ success: false }));
        return true;
    }

    // Only the Codeforces submit-page script may take the pending code.
    if (message.type === 'TAKE_PENDING_SUBMIT') {
        const fromCodeforces = /^https:\/\/(www\.)?codeforces\.com\//.test(sender?.url || '');
        if (!fromCodeforces || typeof message.key !== 'string') {
            sendResponse({ pending: null });
            return true;
        }
        takePendingSubmit(message.key).then(sendResponse).catch(() => sendResponse({ pending: null }));
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
