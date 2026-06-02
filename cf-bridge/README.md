# ICPC HUE — Lightweight Codeforces Bridge (read-only)

Replaces the old heavy `scrapling-bridge` (FastAPI + Scrapling + Playwright,
~1.5 GB, a real headless browser) for the **one** thing the serverless verify
flow needs after the Vercel migration: **reading a user's submissions inside a
PRIVATE Codeforces group, using the user's own session cookies** (supplied by
the unchanged "Verdict Helper" browser extension).

## Why a separate tiny service / function?

Codeforces puts **group / contest** pages behind a Cloudflare *managed
challenge* (`cf-mitigated: challenge`). This was verified empirically against a
real private group (`group/MWSDmqGsZm/contest/219158`) with a real logged-in
user's cookies:

| How we ask Codeforces | Result |
| --- | --- |
| Node `fetch` (the Vercel runtime) + cookies | **403** — Cloudflare "Just a moment" |
| `curl` + cookies | **403** |
| Official API `contest.status`, **signed** with API key | `FAILED` — "Contest not found" (private groups are invisible to the API) |
| Public API `user.status` | private-group submissions are **absent** |
| Plain `curl` **with** a fresh `cf_clearance` (same IP) | **403** — clearance is bound to the browser TLS fingerprint |
| Real headless browser + cookies | 200 ✅ (but needs ~1 GB + a browser, can't run on Vercel) |
| **`curl_cffi` (Chrome TLS impersonation) + cookies** | **200** ✅ |

The managed challenge here is a **TLS / HTTP-2 fingerprint** gate, not a JS gate.
`curl_cffi` impersonates Chrome's fingerprint, so with the user's session
cookies it passes — **no browser, no JS engine**. That makes this deployable as
a normal serverless function. `curl_cffi` statically bundles
`libcurl-impersonate`, so it runs on Lambda/Vercel with only standard system
libs.

> **Important:** `cf_clearance` MUST be stripped before the request. It is bound
> to the originating browser's TLS fingerprint; reusing it from another client
> triggers a 403. The plain session cookies (`JSESSIONID`, `39ce7`, `X-User`,
> `X-User-Sha1`, …) are what authenticate the user. The bridge strips
> `cf_clearance` (and auth/analytics cookies) automatically.

## API

`POST /submissions`

```json
{
  "contestId": "219158",
  "problemIndex": "F",            // optional; filters server-side
  "cookies": "JSESSIONID=...; 39ce7=...; X-User=...",
  "urlType": "group",             // contest | group | gym
  "groupId": "MWSDmqGsZm",        // required when urlType=group
  "count": 200
}
```

```json
{
  "success": true,
  "submissions": [
    {
      "id": 350360837,
      "author": "BusinessDuck1",
      "problemIndex": "F",
      "problemName": "Digits Summation",
      "verdict": "Accepted",
      "timeConsumedMillis": 61,
      "memoryConsumedBytes": 0,
      "language": "C++20 (GCC 13-64)",
      "creationTimeSeconds": 1780000000
    }
  ],
  "error": null
}
```

`GET /health` → `{ "status": "ok", "engine": "curl_cffi", "impersonate": "chrome120" }`

## Deploy

**As its own Vercel project (recommended — keeps the Python runtime separate
from the Next.js app):**

1. Create a new Vercel project and point it at the `cf-bridge/` directory as the
   **Root Directory** (Vercel → New Project → import the repo → set Root
   Directory = `cf-bridge`). Vercel's **FastAPI preset** detects the `app.py`
   entrypoint and the `app = FastAPI()` instance automatically, turning the whole
   app into one Vercel Function with automatic routing — no `vercel.json` needed.
   - `.python-version` pins Python 3.12.
2. After it deploys you'll get a URL like `https://icpchue-cf-bridge.vercel.app`.
   Test it:
   ```bash
   curl https://icpchue-cf-bridge.vercel.app/health
   # -> {"status":"ok","engine":"curl_cffi","impersonate":"chrome120"}
   ```
3. In the **Next.js** project's Vercel env vars (Production), set:
   ```
   CF_BRIDGE_URL=https://icpchue-cf-bridge.vercel.app
   ```
   Then redeploy the Next.js app (or trigger a redeploy so it picks up the var).
   The verify route reads `CF_BRIDGE_URL` (falls back to `SCRAPLING_BRIDGE_URL`).

> Without `CF_BRIDGE_URL` set, the Next.js app defaults to `http://cf-bridge:8787`
> (a docker-compose hostname) which is **unreachable on Vercel** — verify will
> return a 503 "Could not reach the verification service" instead of a misleading
> "No AC found".

**Or with the Vercel CLI (from repo root):**
```bash
cd cf-bridge
vercel --prod          # first run links/creates the project
# then copy the deployment URL into the Next.js project's CF_BRIDGE_URL env var
```

**As a container (Fly.io / Render / Railway / any Docker host):**
```bash
docker build -t cf-bridge ./cf-bridge
docker run -p 8787:8787 cf-bridge
```

**Locally:**
```bash
pip install -r requirements.txt
uvicorn app:app --port 8787
```
