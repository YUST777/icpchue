# Codeforces Integration Feasibility Study

**Date**: 2026-01-14
**Status**: Feasibility Analysis / Architecture Design
**Target**: Seamless Integration of Codeforces Problems into ICPCHUE Local

## 1. Executive Summary

**Can we do it?** Yes.
**Is it easy?** No, primarily due to Codeforces' anti-bot protections (Cloudflare) and lack of a submission API.

The goal of having a URL like `codeforce.icpchue.com/contest/2179/problem/D` that renders the problem and allows submission is **technically possible** but requires specific "Gray Hat" techniques to bypass restrictions.

### The Verdict on "Counted on Codeforces"
To make the submission count on the *Authored User's* Codeforces profile, we **cannot** use a generic server bot. We must impersonate the user. This means we either need their session cookies or we need to run the submission from their browser (via an extension).

---

## 2. Part 1: Fetching & Rendering Problems (The "Mirror")

### Challenge
Codeforces does not have an API to get problem text (HTML/Markdown). We must "scrape" the page.

### The Obstacle: Cloudflare
Codeforces uses strict Cloudflare protection. If our Next.js server tries to `fetch('https://codeforces.com/...')`, it will likely receive a `403 Forbidden` or a CAPTCHA challenge instead of the page content.

### Proposed Solution: Headless Browser or Proxy
1.  **Puppeteer/Playwright**: Run a headless browser on the server. This is heavy and slow but can bypass basic JS challenges.
2.  **FlareSolverr**: An open-source proxy service specifically designed to bypass Cloudflare. We would route our requests through this.
3.  **Client-Side Fetching (The "Extension" Approach)**: Instead of the server fetching the data, the *User's Browser* fetches `codeforces.com` (via a browser extension or CORS proxy) and sends the HTML to our React frontend to render. This is the most robust method because the user is likely already passing the Cloudflare check.

### Parsing Logic
Once we have the HTML, parsing is trivial. The DOM structure of Codeforces is stable:
-   Problem Name: `.problem-statement .title`
-   Time Limit: `.problem-statement .time-limit`
-   Statement: `.problem-statement .statement`
-   Input/Output: `.sample-tests`

**Result**: We can perfectly recreate the UI with our own styling (`ICPCHUE` Theme).

---

## 3. Part 2: Submitting Solutions (The "Engine")

This is the hardest part. Codeforces has NO submission API.

### Option A: The "VJudge" Method (User Impersonation)
*How it works*: Use the user's actual Codeforces account to submit.
1.  **Mechanism**: The user enters their `JSESSIONID` and `39ce7...` (Codeforces auth cookies) into ICPCHUE.
2.  **Process**:
    -   User clicks "Submit" on ICPCHUE.
    -   ICPCHUE Backend takes the code + User Cookies.
    -   Backend simulates a POST request to `codeforces.com/contest/{id}/submit`.
    -   Backend polls the status page using the cookies to check for `Accepted`/`Wrong Answer`.
3.  **Pros**:
    -   Counts on the User's real Codeforces profile.
    -   Bypasses the "250 daily limit" (since it's per user).
4.  **Cons**:
    -   **Security**: Users must trust us with their session cookies (dangerous).
    -   **Fragile**: If Codeforces adds a CAPTCHA to the submit form, this breaks immediately.

### Option B: The "Browser Extension" Method (Recommended)
*How it works*: A Chrome/Firefox extension acts as the bridge.
1.  **Mechanism**: User installs "ICPCHUE Helper" extension.
2.  **Process**:
    -   User clicks "Submit" on ICPCHUE.
    -   The Website sends a message to the Extension.
    -   The Extension (running in the context of `codeforces.com`) functionally "fills out the form and clicks submit" in the background.
    -   The Extension watches for the verdict and sends it back to ICPCHUE.
3.  **Pros**:
    -   **100% Safe**: User never shares credentials.
    -   **Reliable**: Uses the user's valid browser session (cookies, headers, fingerprints are all correct).
    -   **No Captcha Issues**: Real browsers pass Cloudflare easily.
4.  **Cons**:
    -   Requires users to install an extension.

### Option C: The Private Judge (Local)
*How it works*: We fetch the test cases and run them on our own Judge0 instance.
1.  **Pros**: Instant feedback, no reliance on CF uptime.
2.  **Cons**: **DOES NOT COUNT** on Codeforces profile. User solves it here, but stays "Unsolved" on Codeforces.
3.  **Note**: Fetching *hidden* test cases from Codeforces is impossible. We can only fetch the *sample* cases. So we cannot truly verify correctness locally unless we have the full test data (which we don't). **Therefore, this option is invalid for live Codeforces problems.**

---

## 4. Technical Architecture Recommendation

To achieve the "Dream" flow where the user sees a seamless UI:

### Phase 1: The Viewer (Read-Only)
1.  **Route**: `codeforce.icpchue.com/[contest]/[problem]`
2.  **Backend**: Uses a library like `puppeteer` (or a specialized scraping API) to fetch the problem HTML on-demand.
3.  **Frontend**: Renders the HTML inside the slick ICPCHUE layout (Dark mode, animations).
4.  **Submission**: A button "Open in Codeforces to Submit" (Redirects).

### Phase 2: The Extension Bridge (Full Integration)
1.  **Build a simple Chrome Extension**.
2.  **Website**: "Submit" button sends a message to the extension.
3.  **Extension**:
    -   POSTs the code to `codeforces.com`.
    -   Listens for the verdict.
    -   Updates the ICPCHUE UI with "Accepted".
4.  **Data Sync**: We store a copy of the submission in our DB (`training_submissions`), so we can show it on *our* charts too.

---

## 5. Existing Open Source Prior Art

Do not reinvent the wheel. Study these:

1.  **vjudge (Virtual Judge)**: The grandfather of this tech. They historically used shared accounts but now require user logins.
    -   *Lesson*: Shared accounts get banned. User accounts are the way.
2.  **cf-tool (Go)**: A CLI tool that parses and submits.
    -   *Lesson*: Excellent reference for the HTTP request structure required to submit.
3.  **cp-editor**: A desktop app that parses problems.
    -   *Lesson*: Good logic for parsing problem HTML into clean formats.

## 6. Final Conclusion

**Can we mirror the backend?** No, we can only *access* it via the frontend (user).
**Can we mirror the UI?** Yes, absolutely.
**Best Path Forward**: 
Start by building the **Problem Viewer**. It provides immediate value (better UI, dark mode, unity) without the complex engineering of a submission bridge. Add the submission bridge via a **Browser Extension** later.
