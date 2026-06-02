"""
ICPC HUE — Lightweight Codeforces Bridge (read-only)
=====================================================

Replaces the heavy Playwright "scrapling-bridge" for the ONE thing the
serverless verify flow needs: reading a user's submissions in a PRIVATE
Codeforces group, using the user's OWN session cookies (handed over by the
unchanged "Verdict Helper" browser extension).

Why this exists
---------------
Codeforces protects group/contest pages with a Cloudflare *managed challenge*
(`cf-mitigated: challenge`). A plain server-side `fetch`/`curl`/Node-undici
request is answered with HTTP 403 "Just a moment...". The official CF API
(`contest.status`) cannot see private groups at all ("Contest not found"),
even when signed with an API key, and `user.status` omits private-group subs.

Empirically (tested against a real private group + real session cookies):
  - Node fetch + cookies .......... 403 (Cloudflare challenge)
  - curl + cookies ................ 403
  - signed contest.status ......... FAILED "Contest not found"
  - public user.status ............ private-group subs absent
  - headless browser + cookies .... 200 (works, but needs ~1GB + a browser)
  - curl_cffi (Chrome TLS impersonation) + cookies .... 200  ✅

curl_cffi passes the challenge because Cloudflare's managed challenge here is a
TLS/HTTP2 *fingerprint* gate, not a JS gate — so a fingerprint-impersonating
HTTP client gets through with the user's session cookies. No JS engine /
browser required, which makes this deployable as a tiny serverless function.

IMPORTANT: the `cf_clearance` cookie must be STRIPPED before the request.
It is bound to the originating browser's TLS fingerprint; sending it from a
different client triggers a 403. Session cookies alone (JSESSIONID, 39ce7,
X-User, X-User-Sha1, ...) are what authenticate the user.
"""

import re
import html
import time
import logging
from typing import Optional, List, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from curl_cffi import requests as cffi_requests

logger = logging.getLogger("cf-bridge")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = FastAPI(title="ICPC HUE CF Bridge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cookies that must NOT be forwarded to Codeforces:
#  - cf_clearance: TLS-fingerprint-bound, breaks the request if reused elsewhere
#  - analytics / app auth cookies: irrelevant + privacy
_DROP_COOKIE_PREFIXES = ("sb-", "supabase", "_ga", "_gid", "_gat", "cf_clearance")
_DROP_COOKIE_NAMES = {"authtoken", "cf_clearance"}

# Chrome impersonation profile used for the TLS/HTTP2 fingerprint.
_IMPERSONATE = "chrome120"

# Codeforces verdict cell text -> normalized verdict
_ACCEPTED_TOKENS = ("accepted", "ok")


class SubmissionsRequest(BaseModel):
    contestId: str
    problemIndex: Optional[str] = None
    cookies: str = Field(..., description="Raw Cookie header string from the extension")
    urlType: str = "contest"  # contest | group | gym
    groupId: Optional[str] = None
    count: int = 200


class Submission(BaseModel):
    id: int
    author: str
    problemIndex: Optional[str] = None
    problemName: Optional[str] = None
    verdict: str
    timeConsumedMillis: int = 0
    memoryConsumedBytes: int = 0
    language: str = ""
    creationTimeSeconds: int = 0


class SubmissionsResponse(BaseModel):
    success: bool
    submissions: List[Submission] = []
    error: Optional[str] = None


def _clean_cookie_header(raw: str) -> str:
    """Drop cf_clearance / auth / analytics cookies, keep CF session cookies."""
    out = []
    for item in raw.split(";"):
        item = item.strip()
        if "=" not in item:
            continue
        name = item.split("=", 1)[0].strip()
        low = name.lower()
        if low in _DROP_COOKIE_NAMES:
            continue
        if any(low.startswith(p) for p in _DROP_COOKIE_PREFIXES):
            continue
        out.append(item)
    return "; ".join(out)


def _build_status_url(contest_id: str, url_type: str, group_id: Optional[str]) -> str:
    """Build the per-user submissions page URL (the '/my' status table)."""
    if url_type == "gym":
        return f"https://codeforces.com/gym/{contest_id}/my"
    if url_type == "group" and group_id:
        return f"https://codeforces.com/group/{group_id}/contest/{contest_id}/my"
    return f"https://codeforces.com/contest/{contest_id}/my"


def _parse_ms(text: str) -> int:
    m = re.search(r"(\d+)", text or "")
    return int(m.group(1)) if m else 0


def _parse_kb_to_bytes(text: str) -> int:
    m = re.search(r"(\d+)", text or "")
    return (int(m.group(1)) * 1024) if m else 0


def _strip_tags(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def _parse_status_table(html_text: str) -> List[Dict]:
    """
    Parse the Codeforces status datatable.
    Columns (group /my view): [id, when, who, problem, lang, verdict, time, memory]
    """
    rows: List[Dict] = []
    now = int(time.time())
    for sid, body in re.findall(
        r'<tr[^>]*data-submission-id="(\d+)"[^>]*>(.*?)</tr>', html_text, re.S
    ):
        cells = [_strip_tags(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", body, re.S)]
        if len(cells) < 6:
            continue
        # Defensive index mapping (group view has 8 cells)
        problem_cell = cells[3] if len(cells) > 3 else ""
        lang_cell = cells[4] if len(cells) > 4 else ""
        verdict_cell = cells[5] if len(cells) > 5 else ""
        time_cell = cells[6] if len(cells) > 6 else ""
        mem_cell = cells[7] if len(cells) > 7 else ""

        # problem cell looks like "F - Digits Summation"
        pidx, pname = None, None
        pm = re.match(r"^([A-Za-z][0-9]?)\s*-\s*(.*)$", problem_cell)
        if pm:
            pidx = pm.group(1).upper()
            pname = pm.group(2).strip()

        rows.append({
            "id": int(sid),
            "author": cells[2].strip() if len(cells) > 2 else "",
            "problemIndex": pidx,
            "problemName": pname,
            "verdict": verdict_cell.strip(),
            "timeConsumedMillis": _parse_ms(time_cell),
            "memoryConsumedBytes": _parse_kb_to_bytes(mem_cell),
            "language": lang_cell.strip(),
            "creationTimeSeconds": now,
        })
    return rows


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "curl_cffi", "impersonate": _IMPERSONATE}


@app.post("/submissions", response_model=SubmissionsResponse)
async def get_submissions(req: SubmissionsRequest):
    cookie_header = _clean_cookie_header(req.cookies)
    if not cookie_header:
        return SubmissionsResponse(success=False, error="NO_VALID_COOKIES")

    url = _build_status_url(req.contestId, req.urlType, req.groupId)
    if req.problemIndex:
        url += f"?problemIndex={req.problemIndex.upper()}"

    try:
        resp = cffi_requests.get(
            url,
            headers={
                "Cookie": cookie_header,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            impersonate=_IMPERSONATE,
            timeout=30,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("curl_cffi request failed")
        return SubmissionsResponse(success=False, error=f"REQUEST_FAILED: {e}")

    if resp.status_code != 200:
        if "Just a moment" in resp.text:
            return SubmissionsResponse(success=False, error="CLOUDFLARE_CHALLENGE")
        return SubmissionsResponse(success=False, error=f"HTTP_{resp.status_code}")

    if "status-frame-datatable" not in resp.text:
        # Logged-out cookies -> CF redirects to a login/enter page without the table
        if "/enter" in resp.text or "Login into Codeforces" in resp.text:
            return SubmissionsResponse(success=False, error="NOT_LOGGED_IN")
        return SubmissionsResponse(success=False, error="NO_SUBMISSIONS_TABLE")

    parsed = _parse_status_table(resp.text)

    if req.problemIndex:
        want = req.problemIndex.upper()
        parsed = [p for p in parsed if (p.get("problemIndex") or "").upper() == want]

    return SubmissionsResponse(
        success=True,
        submissions=[Submission(**p) for p in parsed],
    )
