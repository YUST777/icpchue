"""
ICPC HUE — Scrapling Bridge v9
Async job-based submission: POST /submit returns immediately with a jobId,
frontend polls GET /submit-result/{jobId} for the result.

v9: Uses Scrapling with headless=False on Xvfb virtual display.
     Turnstile strategy: wait for auto-solve, then JS API, then
     careful click with human-like mouse movement.
"""

import re
import time
import logging
import uuid
import asyncio
import anyio
import subprocess
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict
from scrapling.fetchers import StealthySession, Fetcher

# Ensure DISPLAY is set for virtual display
os.environ.setdefault("DISPLAY", ":99")
os.environ.setdefault("DBUS_SESSION_BUS_ADDRESS", "/dev/null")

app = FastAPI(title="ICPC HUE Scrapling Bridge", version="9.0.0")
logger = logging.getLogger("scrapling-bridge")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory job store ──────────────────────────────────────────────
jobs: Dict[str, dict] = {}
details_cache: Dict[str, dict] = {}
submit_semaphore = asyncio.Semaphore(2)
status_response_cache: Dict[str, dict] = {}

def cleanup_old_jobs():
    now = time.time()
    expired = [k for k, v in jobs.items() if now - v.get("created", 0) > 300]
    for k in expired:
        del jobs[k]
    expired_details = [k for k, v in details_cache.items() if now - v.get("fetched_at", 0) > 600]
    for k in expired_details:
        del details_cache[k]

# ── Language IDs ─────────────────────────────────────────────────────
LANG = {
    "c": 11, "cpp": 89, "cpp20": 89, "cpp17": 54, "cpp14": 50,
    "java": 36, "java17": 87, "python3": 31, "python": 31, "kotlin": 88,
}

# ── Models ───────────────────────────────────────────────────────────
class SubmitRequest(BaseModel):
    contestId: str
    problemIndex: str
    code: str
    language: str
    cookies: str = Field(..., description="Cookie header string")
    csrfToken: str = Field("", description="CSRF token (unused)")
    urlType: str = "contest"
    groupId: Optional[str] = None

class SubmitResponse(BaseModel):
    success: bool
    submissionId: Optional[str] = None
    error: Optional[str] = None

class StatusRequest(BaseModel):
    submissionId: str
    contestId: str
    cookies: str
    urlType: str = "contest"
    groupId: Optional[str] = None

class StatusResponse(BaseModel):
    success: bool
    verdict: Optional[str] = None
    time: Optional[int] = None
    memory: Optional[int] = None
    testNumber: Optional[int] = None
    compilationError: Optional[str] = None
    details: Optional[str] = None
    error: Optional[str] = None

class FeedRequest(BaseModel):
    contestId: str
    problemIndex: Optional[str] = None
    cookies: str
    urlType: str = "contest"
    groupId: Optional[str] = None

class FeedResponse(BaseModel):
    success: bool
    submissions: list = []
    error: Optional[str] = None

# ── Helpers ──────────────────────────────────────────────────────────
def parse_cookies(raw: str):
    d = {}
    for item in raw.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            d[k] = v
    return d, [{"name": k, "value": v, "domain": ".codeforces.com", "path": "/"} for k, v in d.items()]


def build_url(cid: str, typ: str, gid: Optional[str], path: str) -> str:
    if typ == "gym":
        return f"https://codeforces.com/gym/{cid}/{path}"
    if typ == "group" and gid:
        return f"https://codeforces.com/group/{gid}/contest/{cid}/{path}"
    return f"https://codeforces.com/contest/{cid}/{path}"

# ── JS constants ─────────────────────────────────────────────────────
JS_FILL = """(p) => {
    const ps = document.querySelector('select[name="submittedProblemIndex"]');
    if (ps) { ps.value = p.prob; ps.dispatchEvent(new Event('change')); }
    const ls = document.querySelector('select[name="programTypeId"]');
    if (ls) { ls.value = p.lang; ls.dispatchEvent(new Event('change')); }
    const ed = window.ace ? ace.edit('editor') : null;
    if (ed) { ed.setValue(p.code, -1); }
    else {
        const ta = document.getElementById('sourceCodeTextarea') || document.querySelector('textarea[name="source"]');
        if (ta) { ta.value = p.code; ta.dispatchEvent(new Event('input', {bubbles:true})); }
    }
}"""

JS_ERR = """() => {
    if (!document.body) return null;
    const t = document.body.innerText;
    if (t.includes('You have submitted exactly the same code before')) return 'DUPLICATE';
    if (t.includes('You are not allowed') || t.includes('Please register')) return 'VIRTUAL_REGISTRATION_REQUIRED';
    if (t.includes('You should be a member')) return 'GYM_ENTRY_REQUIRED';
    if (t.includes('Please wait') && t.includes('submit again')) return 'RATE_LIMITED';
    return null;
}"""

JS_SUB_ID = """() => {
    const row = document.querySelector('tr[data-submission-id]');
    if (row) return row.getAttribute('data-submission-id');
    if (document.body) {
        const m = document.body.innerHTML.match(/submissionId[\\s"':=]+(\\d+)/);
        return m ? m[1] : null;
    }
    return null;
}"""

JS_DUP_ID = """() => {
    if (!document.body) return null;
    const m = document.body.innerHTML.match(/submissionId=(\\d+)/);
    return m ? m[1] : null;
}"""

JS_GET_TOKEN = """() => {
    const a = document.querySelector('[name="cf-turnstile-response"]');
    if (a && a.value) return a.value;
    const b = document.querySelector('[name="turnstileToken"]');
    if (b && b.value) return b.value;
    if (window.turnstile && window.turnstile.getResponse) {
        try { return window.turnstile.getResponse() || ''; } catch(e) {}
    }
    return '';
}"""


@app.get("/health")
async def health():
    return {"status": "ok"}

# ═════════════════════════════════════════════════════════════════════
# SUBMIT — Scrapling headless=False on Xvfb + xdotool for Turnstile
# ═════════════════════════════════════════════════════════════════════

def _xdotool_click(viewport_x, viewport_y, chrome_left=8, chrome_top=131):
    """
    OS-level mouse click via xdotool on the Xvfb display.
    The browser window is at (0,0) on the virtual display.
    viewport coords + chrome offset = screen coords.
    """
    try:
        screen_x = int(chrome_left + viewport_x)
        screen_y = int(chrome_top + viewport_y)
        logger.info(f"    xdotool: viewport({viewport_x:.0f},{viewport_y:.0f}) + chrome({chrome_left},{chrome_top}) = screen({screen_x},{screen_y})")
        
        # First focus the browser window
        result = subprocess.run(
            ["xdotool", "search", "--name", ""],
            timeout=3, capture_output=True, text=True
        )
        window_ids = result.stdout.strip().split('\n')
        if window_ids and window_ids[0]:
            subprocess.run(["xdotool", "windowfocus", "--sync", window_ids[0]], timeout=3, capture_output=True)
            subprocess.run(["xdotool", "windowactivate", "--sync", window_ids[0]], timeout=3, capture_output=True)
        
        # Move mouse with human-like steps
        subprocess.run(["xdotool", "mousemove", "--sync", str(screen_x), str(screen_y)],
                       timeout=3, capture_output=True)
        time.sleep(0.05 + (time.monotonic() % 0.08))
        subprocess.run(["xdotool", "click", "--clearmodifiers", "1"],
                       timeout=3, capture_output=True)
        return True
    except Exception as e:
        logger.warning(f"  xdotool click failed: {e}")
        return False


def _wait_for_turnstile_token(page, session, timeout_s=60):
    """
    Wait for the embedded Turnstile to produce a token.
    
    v9 Strategy:
    1. Wait for auto-solve (some Turnstiles auto-complete)
    2. Try JS API reset/execute
    3. Use xdotool for OS-level click (bypasses CDP detection)
    4. Poll for token with periodic re-clicks
    
    NOTE: We intentionally skip Scrapling's _cloudflare_solver because
    it uses CDP clicks which Cloudflare detects via screenX/screenY.
    """
    from random import randint
    
    t0 = time.monotonic()
    
    # Check if Turnstile widget exists
    ts_div = page.locator(".cf-turnstile")
    if ts_div.count() == 0:
        logger.info("  no turnstile widget found")
        return True
    
    # Wait for the Turnstile iframe to load
    ts_iframe = None
    for _ in range(20):
        ts_iframe = page.frame(url=re.compile(r"challenges\.cloudflare\.com|turnstile"))
        if ts_iframe:
            break
        page.wait_for_timeout(500)
    
    if not ts_iframe:
        logger.warning("  turnstile iframe never loaded")
        return False
    
    logger.info(f"  turnstile iframe loaded ({time.monotonic()-t0:.1f}s)")
    
    # Get chrome offset from window properties
    offsets = page.evaluate("""() => ({
        chromeLeft: window.outerWidth - window.innerWidth,
        chromeTop: window.outerHeight - window.innerHeight
    })""")
    chrome_left = max(offsets.get("chromeLeft", 8), 0)
    chrome_top = max(offsets.get("chromeTop", 131), 0)
    # If chromeTop is 0, the browser might be in a weird state — use default
    if chrome_top == 0:
        chrome_top = 131
    if chrome_left == 0:
        chrome_left = 8
    logger.info(f"  chrome offset: left={chrome_left}, top={chrome_top}")
    
    # Phase 1: Wait for auto-solve (6 seconds)
    for _ in range(12):
        token = page.evaluate(JS_GET_TOKEN)
        if token:
            logger.info(f"  ✓ turnstile auto-solved ({len(token)} chars, {time.monotonic()-t0:.1f}s)")
            return True
        page.wait_for_timeout(500)
    
    # Phase 2: Try JS API
    logger.info(f"  trying JS turnstile API ({time.monotonic()-t0:.1f}s)")
    page.evaluate("""() => {
        if (window.turnstile) {
            try { turnstile.reset(); } catch(e) {}
            try { turnstile.execute(); } catch(e) {}
        }
    }""")
    
    for _ in range(10):
        token = page.evaluate(JS_GET_TOKEN)
        if token:
            logger.info(f"  ✓ turnstile token via JS API ({len(token)} chars, {time.monotonic()-t0:.1f}s)")
            return True
        page.wait_for_timeout(500)
    
    # Phase 3: xdotool OS-level click on the Turnstile checkbox
    def _do_xdotool_click():
        try:
            iframe_el = ts_iframe.frame_element()
            box = iframe_el.bounding_box()
            if box:
                click_x = box["x"] + randint(24, 30)
                click_y = box["y"] + randint(23, 29)
                logger.info(f"  xdotool clicking turnstile at viewport ({click_x:.0f}, {click_y:.0f}) ({time.monotonic()-t0:.1f}s)")
                _xdotool_click(click_x, click_y, chrome_left, chrome_top)
                return True
        except Exception as e:
            logger.warning(f"  xdotool turnstile click error: {e}")
        return False
    
    _do_xdotool_click()
    
    # Phase 4: Poll for token, re-click every 8s
    elapsed = time.monotonic() - t0
    remaining = timeout_s - elapsed
    polls = int(remaining / 0.5)
    
    for i in range(max(polls, 1)):
        token = page.evaluate(JS_GET_TOKEN)
        if token:
            logger.info(f"  ✓ turnstile token via xdotool ({len(token)} chars, {time.monotonic()-t0:.1f}s)")
            return True
        page.wait_for_timeout(500)
        
        if i > 0 and i % 16 == 0:
            logger.info(f"  re-clicking turnstile ({time.monotonic()-t0:.1f}s)")
            _do_xdotool_click()
    
    logger.warning(f"  ✗ turnstile token empty after {time.monotonic()-t0:.1f}s")
    return False


class SubmitJobResponse(BaseModel):
    jobId: str

class SubmitJobResult(BaseModel):
    status: str
    result: Optional[SubmitResponse] = None


@app.post("/submit", response_model=SubmitJobResponse)
async def submit_code(req: SubmitRequest):
    lang_id = LANG.get(req.language)
    if lang_id is None:
        raise HTTPException(400, f"Unsupported language: {req.language}")
    cleanup_old_jobs()
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {"status": "pending", "result": None, "created": time.time()}
    asyncio.get_event_loop().create_task(_run_submit_job(job_id, req, lang_id))
    logger.info(f"[Submit] job={job_id} {req.contestId}/{req.problemIndex} via {req.urlType}")
    return SubmitJobResponse(jobId=job_id)


@app.get("/submit-result/{job_id}")
async def get_submit_result(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found or expired")
    return {"status": job["status"], "result": job.get("result")}


async def _run_submit_job(job_id: str, req: SubmitRequest, lang_id: int):
    async with submit_semaphore:
        await _do_submit_job(job_id, req, lang_id)

async def _do_submit_job(job_id: str, req: SubmitRequest, lang_id: int):
    """Actual submission logic — Scrapling headless=False on Xvfb."""
    _, cookies = parse_cookies(req.cookies)
    submit_pg = build_url(req.contestId, req.urlType, req.groupId, f"submit?problemIndex={req.problemIndex}")
    my_pg = build_url(req.contestId, req.urlType, req.groupId, "my")

    def do():
        t0 = time.monotonic()
        MAX_TOTAL = 120
        
        with StealthySession(headless=False, solve_cloudflare=True, timeout=90000, cookies=cookies) as s:
            page = s.context.new_page()
            try:
                # 1. Navigate to submit page
                for nav_attempt in range(3):
                    logger.info(f"→ {submit_pg}" + (f" (retry {nav_attempt})" if nav_attempt else ""))
                    try:
                        page.goto(submit_pg, wait_until="domcontentloaded", timeout=45000)
                    except Exception as nav_err:
                        logger.warning(f"  nav attempt {nav_attempt} failed: {nav_err}")
                        if nav_attempt < 2:
                            page.wait_for_timeout(3000)
                            continue
                        else:
                            return {"success": False, "error": f"Could not reach Codeforces (timeout). Try again."}
                    
                    page.wait_for_timeout(1000)

                    if "/enter" in page.url or "/login" in page.url:
                        return {"success": False, "error": "NOT_LOGGED_IN"}

                    content = page.content()
                    is_full_block = "<title>Just a moment</title>" in content or "Checking your browser" in content
                    has_form = "#sourceCodeTextarea" in content or "submittedProblemIndex" in content
                    
                    if is_full_block and not has_form:
                        logger.info("  Cloudflare full-page block, solving...")
                        try:
                            s._cloudflare_solver(page)
                            page.wait_for_timeout(2000)
                        except Exception as cf_err:
                            logger.warning(f"  Cloudflare solver: {cf_err}")
                    elif has_form:
                        logger.info("  form visible")
                        break
                    
                    if "/submit" in page.url or f"contest/{req.contestId}" in page.url:
                        break
                    
                    logger.warning(f"  redirected to {page.url}, retrying...")
                    page.wait_for_timeout(2000)

                if "/enter" in page.url or "/login" in page.url:
                    return {"success": False, "error": "NOT_LOGGED_IN"}

                # 2. Wait for form
                form_found = False
                for form_attempt in range(3):
                    try:
                        page.wait_for_selector("#sourceCodeTextarea", timeout=20000)
                        form_found = True
                        break
                    except Exception:
                        if form_attempt < 2:
                            logger.warning(f"  form not visible yet (attempt {form_attempt+1})")
                            page.evaluate("() => window.scrollTo(0, 0)")
                            page.wait_for_timeout(3000)
                            if "/enter" in page.url or "/login" in page.url:
                                return {"success": False, "error": "NOT_LOGGED_IN"}
                            if form_attempt == 1:
                                try:
                                    page.reload(wait_until="domcontentloaded", timeout=30000)
                                    page.wait_for_timeout(2000)
                                except Exception:
                                    pass

                if not form_found:
                    err = page.evaluate(JS_ERR)
                    logger.warning(f"  form not found — url={page.url}")
                    return {"success": False, "error": err or "FORM_NOT_FOUND"}

                logger.info(f"  form ready ({time.monotonic()-t0:.1f}s)")

                # 3. Fill form
                page.evaluate(JS_FILL, {"prob": req.problemIndex, "lang": str(lang_id), "code": req.code})
                logger.info(f"  form filled ({time.monotonic()-t0:.1f}s)")

                # 4. Solve Turnstile
                page.evaluate("""() => {
                    const ts = document.querySelector('.cf-turnstile');
                    if (ts) ts.scrollIntoView({behavior: 'instant', block: 'center'});
                }""")
                page.wait_for_timeout(500)
                
                elapsed_so_far = time.monotonic() - t0
                ts_budget = max(20, int(MAX_TOTAL - elapsed_so_far - 15))
                got_token = _wait_for_turnstile_token(page, s, timeout_s=ts_budget)
                
                if not got_token:
                    logger.warning("  submitting without turnstile token")

                logger.info(f"  clicking submit ({time.monotonic()-t0:.1f}s)")

                # 5. Submit
                try:
                    page.wait_for_selector("#singlePageSubmitButton", state="visible", timeout=5000)
                    with page.expect_navigation(timeout=15000, wait_until="domcontentloaded"):
                        page.click("#singlePageSubmitButton")
                except Exception as click_err:
                    logger.warning(f"  submit click/nav: {click_err}")
                    page.evaluate("""() => {
                        const f = document.querySelector('form.submit-form') || document.querySelector('form[action*="submit"]');
                        if (f) f.submit();
                    }""")
                    page.wait_for_timeout(2000)

                post_url = page.url
                logger.info(f"  post-submit url: {post_url}")

                # 6. Check for errors
                err = page.evaluate(JS_ERR)
                if err == "DUPLICATE":
                    return {"success": False, "error": "DUPLICATE_SUBMISSION", "submissionId": page.evaluate(JS_DUP_ID)}
                if err:
                    return {"success": False, "error": err}

                # 7. Get submission ID
                sub_id = page.evaluate(JS_SUB_ID)
                if sub_id:
                    logger.info(f"  ✓ id={sub_id} ({time.monotonic()-t0:.1f}s)")
                    return {"success": True, "submissionId": sub_id}

                # 8. Still on submit page — check /my
                if "/submit" in page.url:
                    logger.warning(f"  still on submit page — checking /my")
                    page.goto(my_pg, wait_until="domcontentloaded")
                    try:
                        page.wait_for_selector("tr[data-submission-id]", timeout=8000)
                        sub_id = page.evaluate(JS_SUB_ID)
                    except Exception:
                        pass

                elapsed = time.monotonic() - t0
                logger.info(f"  done id={sub_id} ({elapsed:.1f}s)")
                return {"success": True, "submissionId": sub_id}
            finally:
                page.close()

    try:
        result = await anyio.to_thread.run_sync(do)
        jobs[job_id] = {"status": "done", "result": result, "created": jobs[job_id]["created"]}
    except Exception as e:
        logger.exception(f"Submit error: {e}")
        jobs[job_id] = {"status": "done", "result": {"success": False, "error": str(e)}, "created": jobs[job_id]["created"]}

# ═════════════════════════════════════════════════════════════════════
# STATUS — fast HTTP first, stealth fallback
# ═════════════════════════════════════════════════════════════════════
VERDICT_MAP = {
    "accepted": "OK", "happy new year": "OK",
    "wrong answer": "WRONG_ANSWER", "compilation error": "COMPILATION_ERROR",
    "time limit exceeded": "TIME_LIMIT_EXCEEDED", "memory limit exceeded": "MEMORY_LIMIT_EXCEEDED",
    "runtime error": "RUNTIME_ERROR", "testing": "TESTING",
    "challenged": "CHALLENGED", "skipped": "SKIPPED", "partial": "PARTIAL",
}


def normalize_verdict(raw: str) -> str:
    vl = raw.lower()
    for k, v in VERDICT_MAP.items():
        if k in vl:
            return v
    return raw


@app.post("/status", response_model=StatusResponse)
async def check_status(req: StatusRequest):
    my = build_url(req.contestId, req.urlType, req.groupId, "my")
    cookie_dict, cookie_list = parse_cookies(req.cookies)

    cache_key = f"{req.contestId}:{req.submissionId}"
    cached = status_response_cache.get(cache_key)
    if cached:
        age = time.time() - cached["ts"]
        verdict_str = (cached["data"].get("verdict") or "").lower()
        is_final = verdict_str and "testing" not in verdict_str and "queue" not in verdict_str
        ttl = 30 if is_final else 2
        if age < ttl:
            d = cached["data"]
            return StatusResponse(
                success=True, verdict=d.get("verdict"),
                time=d.get("time", 0), memory=d.get("memory", 0),
                testNumber=d.get("testNumber"),
                compilationError=d.get("compilationError"),
                details=d.get("details"),
            )

    def fast():
        try:
            resp = Fetcher.get(my, cookies=cookie_dict, timeout=10, follow_redirects=True)
            html = resp.body.decode("utf-8", errors="replace") if isinstance(resp.body, bytes) else str(resp.body)
            if "cf-challenge" in html or "Just a moment" in html:
                return None
            m = re.search(rf'<tr[^>]*data-submission-id="{re.escape(req.submissionId)}"[^>]*>(.*?)</tr>', html, re.DOTALL)
            if not m:
                return {"error": "not_found"}
            cells = re.findall(r'<td[^>]*>(.*?)</td>', m.group(1), re.DOTALL)
            if len(cells) < 6:
                return {"error": "malformed"}
            clean = lambda h: ' '.join(re.sub(r'<.*?>', ' ', h).split())
            verdict_raw = clean(cells[5])
            result = {"verdict": verdict_raw,
                    "time": clean(cells[6]) if len(cells) > 6 else None,
                    "memory": clean(cells[7]) if len(cells) > 7 else None}

            vl = verdict_raw.lower()
            is_final_fail = ("testing" not in vl and "queue" not in vl and
                           "accepted" not in vl and "happy new year" not in vl and
                           verdict_raw and verdict_raw != "null")
            if is_final_fail:
                cached_detail = details_cache.get(req.submissionId)
                if cached_detail:
                    if cached_detail.get("compilationError"):
                        result["compilationError"] = cached_detail["compilationError"]
                    if cached_detail.get("details"):
                        result["details"] = cached_detail["details"]
                else:
                    try:
                        import json
                        csrf = None
                        csrf_match = re.search(r'name="X-Csrf-Token"\s+content="([^"]+)"', html)
                        if csrf_match:
                            csrf = csrf_match.group(1)
                        if not csrf:
                            csrf_match = re.search(r'csrf_token\s*[=:]\s*["\']([a-f0-9]+)', html)
                            if csrf_match:
                                csrf = csrf_match.group(1)

                        proto_headers = {"X-Requested-With": "XMLHttpRequest", "Referer": my}
                        if csrf:
                            proto_headers["X-Csrf-Token"] = csrf

                        proto_resp = Fetcher.post(
                            "https://codeforces.com/data/judgeProtocol",
                            data={"submissionId": req.submissionId},
                            cookies=cookie_dict, headers=proto_headers,
                            timeout=10, follow_redirects=True,
                        )
                        proto_body = proto_resp.body.decode("utf-8", errors="replace") if isinstance(proto_resp.body, bytes) else str(proto_resp.body)

                        if proto_body and not proto_body.startswith("<!DOCTYPE"):
                            try:
                                proto_data = json.loads(proto_body)
                                if isinstance(proto_data, str):
                                    detail_text = proto_data
                                elif isinstance(proto_data, list):
                                    parts = []
                                    for item in proto_data:
                                        if isinstance(item, dict):
                                            parts.append(
                                                f"Test: #{item.get('testNumber', '?')}, "
                                                f"time: {item.get('timeConsumed', '?')} ms., "
                                                f"memory: {item.get('memoryConsumed', '?')} KB, "
                                                f"exit code: {item.get('exitCode', '?')}, "
                                                f"checker exit code: {item.get('checkerExitCode', '?')}, "
                                                f"verdict: {item.get('verdict', '?')}"
                                            )
                                            if item.get("input"):
                                                parts.append(f"Input\n{item['input']}")
                                            if item.get("output"):
                                                parts.append(f"Output\n{item['output']}")
                                            if item.get("answer"):
                                                parts.append(f"Answer\n{item['answer']}")
                                            if item.get("checkerLog"):
                                                parts.append(f"Checker Log\n{item['checkerLog']}")
                                        elif isinstance(item, str):
                                            parts.append(item)
                                    detail_text = "\n".join(parts)
                                elif isinstance(proto_data, dict):
                                    detail_text = json.dumps(proto_data, indent=2)
                                else:
                                    detail_text = str(proto_data)

                                if detail_text:
                                    if "compilation error" in vl:
                                        result["compilationError"] = detail_text
                                    else:
                                        result["details"] = detail_text
                                    details_cache[req.submissionId] = {
                                        "fetched_at": time.time(),
                                        "compilationError": result.get("compilationError"),
                                        "details": result.get("details"),
                                    }
                            except json.JSONDecodeError:
                                pass
                    except Exception as e:
                        logger.warning(f"[JudgeProtocol] fetch failed: {e}")

            return result
        except Exception as e:
            logger.warning(f"Fast check: {e}")
            return None

    def stealth_fetch_verdict():
        with StealthySession(headless=True, solve_cloudflare=True, timeout=45000, cookies=cookie_list) as s:
            page = s.context.new_page()
            try:
                page.goto(my, wait_until="domcontentloaded")
                if "<title>Just a moment...</title>" in page.content():
                    s._cloudflare_solver(page)
                page.wait_for_selector(".status-frame-datatable", timeout=10000)
                data = page.evaluate("""(subId) => {
                    const row = document.querySelector('tr[data-submission-id="' + subId + '"]');
                    if (!row) return {error: "not_found"};
                    const c = row.cells;
                    if (!c || c.length < 6) return {error: "malformed"};
                    const vc = row.querySelector('.status-verdict-cell') || c[5];
                    return {
                        verdict: vc ? vc.innerText.trim() : null,
                        time: c[6] ? c[6].innerText.trim() : null,
                        memory: c[7] ? c[7].innerText.trim() : null,
                    };
                }""", str(req.submissionId))
                return data
            except Exception as e:
                logger.error(f"Stealth status: {e}")
                return None
            finally:
                page.close()

    try:
        res = await anyio.to_thread.run_sync(fast)
        if not res or "error" in res:
            for _ in range(2):
                res = await anyio.to_thread.run_sync(stealth_fetch_verdict)
                if res and "error" not in res:
                    break
                await anyio.sleep(1)

        if not res or "error" in res:
            return StatusResponse(success=False, error="SUBMISSION_NOT_FOUND")

        time_ms = memory_kb = 0
        try:
            m = re.search(r'(\d+)', res.get("time") or "")
            if m: time_ms = int(m.group(1))
            m = re.search(r'(\d+)', res.get("memory") or "")
            if m: memory_kb = int(m.group(1))
        except Exception:
            pass
        test_num = None
        m = re.search(r'test\s+(\d+)', res.get("verdict") or "", re.I)
        if m:
            test_num = int(m.group(1))

        cache_data = {
            "verdict": normalize_verdict(res.get("verdict") or ""),
            "time": time_ms, "memory": memory_kb, "testNumber": test_num,
            "compilationError": res.get("compilationError"),
            "details": res.get("details"),
        }
        status_response_cache[cache_key] = {"data": cache_data, "ts": time.time()}
        now = time.time()
        expired = [k for k, v in status_response_cache.items() if now - v["ts"] > 60]
        for k in expired:
            del status_response_cache[k]

        return StatusResponse(
            success=True, verdict=cache_data["verdict"],
            time=time_ms, memory=memory_kb, testNumber=test_num,
            compilationError=res.get("compilationError"),
            details=res.get("details"),
        )
    except Exception as e:
        logger.exception(f"Status error: {e}")
        return StatusResponse(success=False, error=str(e))

# ═════════════════════════════════════════════════════════════════════
# GLOBAL SUBMISSIONS FEED
# ═════════════════════════════════════════════════════════════════════
@app.post("/submissions", response_model=FeedResponse)
async def fetch_global_submissions(req: FeedRequest):
    status_url = build_url(req.contestId, req.urlType, req.groupId, "status")
    if req.problemIndex:
        status_url += f"?problemIndex={req.problemIndex}"
    _, cookies = parse_cookies(req.cookies)

    def do():
        with StealthySession(headless=True, solve_cloudflare=True, timeout=60000, cookies=cookies) as s:
            page = s.context.new_page()
            try:
                page.goto(status_url, wait_until="networkidle")
                if "<title>Just a moment...</title>" in page.content():
                    s._cloudflare_solver(page)
                page.wait_for_selector(".status-frame-datatable", timeout=15000)
                return page.evaluate("""() => {
                    const d = [];
                    document.querySelectorAll("tr[data-submission-id]").forEach(r => {
                        const c = r.cells;
                        if (c.length >= 8) d.push({
                            id: parseInt(r.getAttribute("data-submission-id")),
                            author: c[2].innerText.trim(), verdict: c[5].innerText.trim(),
                            time: c[6].innerText.trim(), memory: c[7].innerText.trim(),
                            lang: c[4].innerText.trim()
                        });
                    });
                    return d;
                }""")
            except Exception as e:
                logger.error(f"Scrape: {e}")
                return None
            finally:
                page.close()

    try:
        raw = await anyio.to_thread.run_sync(do)
        if raw is None:
            return FeedResponse(success=False, error="SCRAPE_FAILED")
        now = int(time.time())
        mapped = []
        for s in raw:
            ms = kb = 0
            try:
                m = re.search(r'(\d+)', s["time"])
                if m: ms = int(m.group(1))
                m = re.search(r'(\d+)', s["memory"])
                if m: kb = int(m.group(1)) * 1024
            except Exception:
                pass
            mapped.append({"id": s["id"], "creationTimeSeconds": now, "author": s["author"],
                           "verdict": s["verdict"], "timeConsumedMillis": ms,
                           "memoryConsumedBytes": kb, "language": s["lang"]})
        return FeedResponse(success=True, submissions=mapped)
    except Exception as e:
        logger.exception(f"Feed error: {e}")
        return FeedResponse(success=False, error=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
