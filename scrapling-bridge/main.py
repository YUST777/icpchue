"""
ICPC HUE — Scrapling Bridge
Server-side Codeforces submission using the user's real session cookies.
"""

import re
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import httpx

app = FastAPI(title="ICPC HUE Scrapling Bridge", version="1.0.0")
logger = logging.getLogger("scrapling-bridge")
logging.basicConfig(level=logging.INFO)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service, not exposed publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Language ID Mapping ──────────────────────────────────────────────
# Codeforces uses numeric language IDs for submission
LANGUAGE_MAP = {
    "c":        11,   # GNU GCC 5.1.0
    "cpp":      89,   # GNU G++20 11.2.0 (64 bit, winlibs)
    "cpp20":    89,
    "cpp17":    54,
    "cpp14":    50,
    "java":     36,   # Java 8
    "java17":   87,   # Java 17
    "python3":  31,   # Python 3.8.10
    "python":   31,
    "kotlin":   88,   # Kotlin 1.7
}


class SubmitRequest(BaseModel):
    contestId: str
    problemIndex: str
    code: str
    language: str
    cookies: str = Field(..., description="Cookie header string from the user's browser")
    csrfToken: str = Field(..., description="CSRF token from the CF submit page")
    urlType: str = "contest"           # contest | gym | group
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


def get_submit_url(contest_id: str, url_type: str, group_id: Optional[str]) -> str:
    """Build the CF submit form action URL."""
    if url_type == "gym":
        return f"https://codeforces.com/gym/{contest_id}/submit"
    elif url_type == "group" and group_id:
        return f"https://codeforces.com/group/{group_id}/contest/{contest_id}/submit"
    return f"https://codeforces.com/contest/{contest_id}/submit"


def get_submit_page_url(contest_id: str, problem_index: str, url_type: str, group_id: Optional[str]) -> str:
    """URL of the submit page, used as Referer."""
    if url_type == "gym":
        return f"https://codeforces.com/gym/{contest_id}/submit?problemIndex={problem_index}"
    elif url_type == "group" and group_id:
        return f"https://codeforces.com/group/{group_id}/contest/{contest_id}/submit?problemIndex={problem_index}"
    return f"https://codeforces.com/contest/{contest_id}/submit?problemIndex={problem_index}"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scrapling-bridge"}


@app.post("/submit", response_model=SubmitResponse)
async def submit_code(req: SubmitRequest):
    """
    Submit code to Codeforces using the user's real session cookies.
    This bypasses Cloudflare because we're using the user's authenticated session.
    """

    lang_id = LANGUAGE_MAP.get(req.language)
    if lang_id is None:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {req.language}")

    submit_url = get_submit_url(req.contestId, req.urlType, req.groupId)
    referer = get_submit_page_url(req.contestId, req.problemIndex, req.urlType, req.groupId)

    # Convert cookie string to dict for Scrapling
    cookie_dict = {}
    for item in req.cookies.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookie_dict[k] = v

    # Build the same form data Codeforces expects
    form_data = {
        "csrf_token": req.csrfToken,
        "action": "submitSolutionFormSubmitted",
        "ftaa": "",
        "bfaa": "",
        "submittedProblemIndex": req.problemIndex,
        "programTypeId": str(lang_id),
        "source": req.code,
        "tabSize": "4",
        "sourceCodeConfirmed": "true",
        "_tta": "176",
    }

    # Reconstruct referer/submit URLs
    submit_url = f"https://codeforces.com/contest/{req.contestId}/submit"
    if req.urlType == "group" and req.groupId:
        submit_url = f"https://codeforces.com/group/{req.groupId}/contest/{req.contestId}/submit"
    elif req.urlType == "gym":
        submit_url = f"https://codeforces.com/gym/{req.contestId}/submit"
        
    referer = f"{submit_url}?problemIndex={req.problemIndex}"

    from scrapling.fetchers import StealthySession, Fetcher
    import anyio

    async def perform_fast_submit():
        """Attempt submission via lightweight HTTP POST first."""
        fetcher = None
        try:
            # Fetcher does NOT support context manager in this version
            fetcher = Fetcher(cookies=cookie_dict, timeout=15)
            logger.info(f"Attempting Fast Path submission to {submit_url}...")
            resp = fetcher.post(submit_url, data=form_data, headers={"Referer": referer})
            content = resp.text
            final_url = resp.url
            
            if resp.status_code in [200, 302]:
                if "cf-challenge" in content or "Just a moment..." in content:
                    logger.info("Fast Path hit Cloudflare challenge.")
                    return None
                if "/enter" in final_url or "/login" in final_url:
                    return {"success": False, "error": "NOT_LOGGED_IN", "status": 403}

                sub_id_match = re.search(r'data-submission-id="(\d+)"', content)
                if not sub_id_match: sub_id_match = re.search(r'/submission/(\d+)', final_url)
                
                if sub_id_match:
                    logger.info(f"Fast Path successful: {sub_id_match.group(1)}")
                    return {"success": True, "submissionId": sub_id_match.group(1), "status": 200, "url": final_url, "text": content}
                if "/my" in final_url or "/status" in final_url:
                    logger.info("Fast Path redirected to status page.")
                    return {"success": True, "submissionId": None, "status": 200, "url": final_url, "text": content}
            return None
        except Exception as e:
            logger.warning(f"Fast Path error: {e}")
            return None
        finally:
            if fetcher:
                try: 
                    # If it has a close method, use it
                    if hasattr(fetcher, 'close'): fetcher.close()
                except: pass

    def perform_stealth_submit():
        # Convert dictionary to list of cookie objects for Playwright/Scrapling
        cookie_list = [
            {"name": k, "value": v, "domain": ".codeforces.com", "path": "/"}
            for k, v in cookie_dict.items()
        ]

        # Use a persistent context session
        with StealthySession(
            headless=True,
            solve_cloudflare=True,
            timeout=60000, # 60s
            cookies=cookie_list,
        ) as session:
            page = session.context.new_page()
            
            # 1. Navigate to the actual submission page
            logger.info(f"Navigating to {referer}...")
            page.goto(referer, wait_until="networkidle")
            
            # Use the built-in solver if CF interstitial is present
            if "<title>Just a moment...</title>" in page.content():
                logger.info("Cloudflare interstitial detected, solving...")
                session._cloudflare_solver(page)
            
            # 2. Fill the form in the real UI
            try:
                # Select problem index if not already selected (sometimes it's pre-filled by URL)
                # But to be safe, we select it
                logger.info(f"Selecting problem {req.problemIndex}...")
                page.select_option("select[name='submittedProblemIndex']", req.problemIndex)
                
                # Select language
                logger.info(f"Selecting language {lang_id}...")
                page.select_option("select[name='programTypeId']", str(lang_id))
                
                # Input source code (using fill or set_input_value)
                logger.info("Pasting source code...")
                # Codeforces often uses a specialized editor, but the textarea is usually there for fallback or as a target
                # We'll try to use focus + type or evaluate to set value if it's an Ace editor
                page.wait_for_selector("#sourceCodeTextarea", timeout=10000)
                page.evaluate("""(code) => { 
                    const editor = window.ace ? ace.edit('editor') : null;
                    if (editor) {
                        editor.setValue(code);
                    } else {
                        const ta = document.getElementsByName('source')[0] || document.getElementById('sourceCodeTextarea');
                        if (ta) ta.value = code;
                    }
                }""", req.code)

                # 3. Wait for Turnstile if present
                if page.locator(".cf-turnstile").is_visible():
                    logger.info("Embedded Turnstile detected, solving/waiting...")
                    session._cloudflare_solver(page)
                    # Let it settle for a second after solver confirms
                    page.wait_for_timeout(1000)

                # 4. Click Submit
                logger.info("Clicking Submit button...")
                page.wait_for_selector("#singlePageSubmitButton", state="visible", timeout=30000)
                # We wait for navigation triggered by click
                with page.expect_navigation(timeout=60000):
                    page.click("#singlePageSubmitButton")
                
                # 5. Extract results after redirect
                final_url = page.url
                response_text = page.content()
                status = 200 # If we reached here, it's 200
                
                result = {
                    'status': status,
                    'url': final_url,
                    'text': response_text
                }
                page.close()
                return result

            except Exception as e:
                logger.error(f"Automation error: {e}")
                # Fallback to the old method if automation fails? 
                # No, let's keep it clean
                raise

    try:
        # 1. Try Fast Path first
        fast_res = await perform_fast_submit()
        if fast_res and fast_res.get("success"):
            return SubmitResponse(success=True, submissionId=fast_res.get("submissionId"))
        if fast_res and fast_res.get("error"):
            return SubmitResponse(success=False, error=fast_res["error"])

        # 2. Fallback to Stealth Browser
        logger.info("Fast Path failed or skipped, using stealth browser...")
        res_data = await anyio.to_thread.run_sync(perform_stealth_submit)
        
        status = res_data['status']
        final_url = res_data['url']
        response_text = res_data['text']

        logger.info(f"CF response status: {status}, URL: {final_url}")

        # ── Check HTTP status first ──
        if status == 403:
            logger.error(f"CF 403 Forbidden. Body snippet: {response_text[:1000]}")
            return SubmitResponse(success=False, error="NOT_LOGGED_IN")

        if "/enter" in final_url or "/login" in final_url:
            return SubmitResponse(success=False, error="NOT_LOGGED_IN")

        # ── Check for common errors ──
        if "You have submitted exactly the same code before" in response_text:
            dup_match = re.search(r'submissionId=(\d+)', response_text)
            return SubmitResponse(
                success=False,
                error="DUPLICATE_SUBMISSION",
                submissionId=dup_match.group(1) if dup_match else None,
            )

        if "You are not allowed" in response_text or "Please register" in response_text:
            return SubmitResponse(success=False, error="VIRTUAL_REGISTRATION_REQUIRED")

        if "You should be a member" in response_text:
            return SubmitResponse(success=False, error="GYM_ENTRY_REQUIRED")

        if "Please wait" in response_text and "submit again" in response_text:
            return SubmitResponse(success=False, error="RATE_LIMITED")

        # ── Success: extract the submission ID ──
        sub_id_match = re.search(r'data-submission-id="(\d+)"', response_text)
        if not sub_id_match:
            sub_id_match = re.search(r'/submission/(\d+)', final_url)
        if not sub_id_match:
            sub_id_match = re.search(r'submissionId["\s:=]+(\d+)', response_text)

        if sub_id_match:
            return SubmitResponse(success=True, submissionId=sub_id_match.group(1))

        if "/my" in final_url or "/status" in final_url:
            return SubmitResponse(success=True, submissionId=None)

        logger.error(f"Unknown CF response. URL={final_url}, body length={len(response_text)}")
        # Log a snippet to see what's going on
        logger.error(f"Response snippet: {response_text[:2000]}")
        with open("/tmp/cf_response.html", "w") as f:
            f.write(response_text)
        return SubmitResponse(success=False, error="UNKNOWN_RESPONSE")

    except Exception as e:
        logger.exception(f"Submission error: {e}")
        return SubmitResponse(success=False, error=str(e))

@app.post("/submissions", response_model=FeedResponse)
async def fetch_global_submissions(req: FeedRequest):
    """
    Fetch global submissions for a contest by scraping the status page.
    This works for both public and private group contests.
    """
    logger.info(f"Fetching global submissions for contest {req.contestId}...")
    
    # ── Reconstruct status URL ──
    status_url = f"https://codeforces.com/contest/{req.contestId}/status"
    if req.urlType == "group" and req.groupId:
        status_url = f"https://codeforces.com/group/{req.groupId}/contest/{req.contestId}/status"
    elif req.urlType == "gym":
        status_url = f"https://codeforces.com/gym/{req.contestId}/status"

    if req.problemIndex:
        status_url += f"?problemIndex={req.problemIndex}"

    # Convert cookies
    cookie_dict = {}
    for item in req.cookies.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookie_dict[k] = v
    cookie_list = [
        {"name": k, "value": v, "domain": ".codeforces.com", "path": "/"}
        for k, v in cookie_dict.items()
    ]

    from scrapling.fetchers import StealthySession
    import anyio
    import time

    def perform_stealth_scrape():
        with StealthySession(
            headless=True,
            solve_cloudflare=True,
            timeout=60000,
            cookies=cookie_list,
        ) as session:
            page = session.context.new_page()
            logger.info(f"Navigating to {status_url}...")
            page.goto(status_url, wait_until="networkidle")

            if "<title>Just a moment...</title>" in page.content():
                logger.info("Cloudflare interstitial detected, solving...")
                session._cloudflare_solver(page)

            try:
                # Wait for the table to load
                page.wait_for_selector(".status-frame-datatable", timeout=15000)
                
                # Extract submissions from the table
                js_extract = """
                () => {
                    const submissions = [];
                    const rows = Array.from(document.querySelectorAll(".status-frame-datatable tr[data-submission-id]"));
                    
                    rows.forEach(row => {
                        const id = row.getAttribute("data-submission-id");
                        const cells = Array.from(row.querySelectorAll("td"));
                        if (cells.length < 8) return;
                        
                        const timeStr = cells[1].innerText.trim();
                        // Author often has nested spans or is a handle
                        const author = cells[2].innerText.trim();
                        const problem = cells[3].innerText.trim();
                        const lang = cells[4].innerText.trim();
                        const verdictCell = cells[5];
                        const verdict = verdictCell.innerText.trim();
                        const runtime = cells[6].innerText.trim();
                        const memory = cells[7].innerText.trim();
                        
                        submissions.append({
                            id: id,
                            creationTimeSeconds: 0, // We'll estimate this or use timeStr if we really need it
                            author: author,
                            verdict: verdict,
                            timeConsumedMillis: runtime,
                            memoryConsumedBytes: memory,
                            language: lang
                        });
                    });
                    return submissions;
                }
                """
                # More robust extraction using native DOM methods
                submissions = page.evaluate("""() => {
                    const data = [];
                    const rows = document.querySelectorAll("tr[data-submission-id]");
                    rows.forEach(row => {
                        const id = row.getAttribute("data-submission-id");
                        const cells = row.cells;
                        if (cells.length >= 8) {
                            data.push({
                                id: parseInt(id),
                                author: cells[2].innerText.trim(),
                                verdict: cells[5].innerText.trim(),
                                time: cells[6].innerText.trim(),
                                memory: cells[7].innerText.trim(),
                                lang: cells[4].innerText.trim()
                            });
                        }
                    });
                    return data;
                }""")
                
                page.close()
                return submissions
            except Exception as e:
                logger.error(f"Scrape error: {e}")
                page.close()
                return None

    try:
        raw_submissions = await anyio.to_thread.run_sync(perform_stealth_scrape)
        
        if raw_submissions is None:
            return FeedResponse(success=False, error="SCRAPE_FAILED")

        # Normalize data to match Public API format for Next.js consistency
        mapped = []
        now = int(time.time())
        for s in raw_submissions:
            # Basic parsing for time/memory
            ms = 0
            kb = 0
            try:
                ms_match = re.search(r'(\d+)', s['time'])
                if ms_match: ms = int(ms_match.group(1))
                kb_match = re.search(r'(\d+)', s['memory'])
                if kb_match: kb = int(kb_match.group(1)) * 1024 # Public API uses Bytes
            except:
                pass

            mapped.append({
                "id": s['id'],
                "creationTimeSeconds": now, # Approximate
                "author": s['author'],
                "verdict": s['verdict'],
                "timeConsumedMillis": ms,
                "memoryConsumedBytes": kb,
                "language": s['lang']
            })

        return FeedResponse(success=True, submissions=mapped)

    except Exception as e:
        logger.exception(f"Global feed error: {e}")
        return FeedResponse(success=False, error=str(e))

@app.post("/status", response_model=StatusResponse)
async def check_status(req: StatusRequest):
    logger.info(f"Checking status for submission {req.submissionId} in contest {req.contestId}...")
    
    # ── Reconstruct status URL ──
    base_url = f"https://codeforces.com/contest/{req.contestId}/my"
    if req.urlType == "group" and req.groupId:
        base_url = f"https://codeforces.com/group/{req.groupId}/contest/{req.contestId}/my"
    elif req.urlType == "gym":
        base_url = f"https://codeforces.com/gym/{req.contestId}/my"

    # Convert cookies
    cookie_dict = {}
    for item in req.cookies.split(';'):
        if '=' in item:
            k, v = item.strip().split('=', 1)
            cookie_dict[k] = v
    cookie_list = [
        {"name": k, "value": v, "domain": ".codeforces.com", "path": "/"}
        for k, v in cookie_dict.items()
    ]

    from scrapling.fetchers import StealthySession
    import anyio

    def perform_stealth_check_with_details():
        with StealthySession(
            headless=True,
            solve_cloudflare=True,
            timeout=60000,
            cookies=cookie_list,
        ) as session:
            page = session.context.new_page()
            logger.info(f"Navigating to {base_url}...")
            page.goto(base_url, wait_until="networkidle")

            if "<title>Just a moment...</title>" in page.content():
                logger.info("Cloudflare interstitial detected, solving...")
                session._cloudflare_solver(page)

            try:
                # Wait for the table to load
                page.wait_for_selector(".status-frame-datatable", timeout=10000)
                
                # Step 1: Extract basic data from the table
                js_extract_basic = """
                (subId) => {
                    const rows = Array.from(document.querySelectorAll(".status-frame-datatable tr, tr"));
                    const row = rows.find(r => r.innerText.includes(subId));
                    if (!row) return { error: "Row not found" };
                    
                    const cells = Array.from(row.querySelectorAll("td"));
                    // Try to find cells by class or index
                    const verdictCell = row.querySelector(".status-verdict-cell, .status-verdict, .verdict-rejected, .verdict-accepted") || cells[5];
                    const timeCell = row.querySelector(".time-consumed") || cells[6];
                    const memoryCell = row.querySelector(".memory-consumed") || cells[7];
                    const infoLink = row.querySelector("a.information-box-link");

                    let verdict = verdictCell ? verdictCell.innerText.trim() : null;
                    if (!verdict && infoLink) {
                        verdict = infoLink.innerText.trim() || "Compilation error";
                    }

                    return {
                        verdict: verdict,
                        time: timeCell ? timeCell.innerText.trim() : null,
                        memory: memoryCell ? memoryCell.innerText.trim() : null,
                        hasDetails: !!infoLink
                    };
                }
                """
                basic_data = page.evaluate(js_extract_basic, str(req.submissionId))
                
                if not basic_data or 'error' in basic_data:
                    page.close()
                    return basic_data

                # Step 2: If there's an error and detailed info might be available, click it
                compilation_error = None
                extra_details = None
                
                v_lower = (basic_data['verdict'] or "").lower()
                is_compilation = "compilation error" in v_lower
                is_testing = "testing" in v_lower
                is_accepted = "accepted" in v_lower or "happy new year" in v_lower
                
                if basic_data['hasDetails'] and not is_testing and not is_accepted:
                    logger.info("Clicking for details...")
                    page.evaluate(f"""(subId) => {{
                        const rows = Array.from(document.querySelectorAll("tr"));
                        const row = rows.find(r => r.innerText.includes(subId));
                        if (row) {{
                            const link = row.querySelector("a.information-box-link");
                            if (link) link.click();
                        }}
                    }}""", str(req.submissionId))
                    
                    try:
                        # Wait for facebox popup (either for compilation or test details)
                        page.wait_for_selector("#facebox .content", timeout=5000)
                        
                        if is_compilation:
                            # Compilation errors are usually in PRE
                            compilation_error = page.locator("#facebox .content pre").inner_text()
                        else:
                            # Test case details or other info
                            extra_details = page.locator("#facebox .content").inner_text()
                    except:
                        logger.warning("Captured detail popup failed or timed out.")

                page.close()
                return {
                    "verdict": basic_data.get('verdict'),
                    "time": basic_data.get('time'),
                    "memory": basic_data.get('memory'),
                    "compilationError": compilation_error,
                    "details": extra_details
                }
            except Exception as e:
                logger.error(f"Status check automation error: {e}")
                page.close()
                return None

    def perform_fast_check():
        from scrapling.fetchers import Fetcher
        import re
        try:
            with Fetcher(cookies=cookie_dict, timeout=10) as fetcher:
                logger.info(f"Attempting fast status check for {base_url}")
                resp = fetcher.get(base_url)
                content = resp.text
                
                if "cf-challenge" in content or "Just a moment..." in content:
                    return None
                    
                row_pattern = re.compile(rf'<tr[^>]*data-submission-id="{req.submissionId}"[^>]*>(.*?)</tr>', re.DOTALL)
                row_match = row_pattern.search(content)
                
                if not row_match:
                    return {"error": "Row not found"}
                    
                row_html = row_match.group(1)
                
                td_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL)
                cells = td_pattern.findall(row_html)
                
                if len(cells) < 6:
                    return {"error": "Malformed row"}
                    
                def clean_html(raw_html):
                    # Remove html tags and normalise whitespace
                    text = re.sub(r'<.*?>', ' ', raw_html)
                    return ' '.join(text.split())
                
                verdict_text = clean_html(cells[5])
                time_text = clean_html(cells[6]) if len(cells) > 6 else None
                memory_text = clean_html(cells[7]) if len(cells) > 7 else None
                
                has_details = 'information-box-link' in cells[5]
                
                return {
                    "verdict": verdict_text,
                    "time": time_text,
                    "memory": memory_text,
                    "hasDetails": has_details,
                    "compilationError": None,
                    "details": None
                }
        except Exception as e:
            logger.warning(f"Fast check failed: {e}")
            return None

    try:
        res_data = await anyio.to_thread.run_sync(perform_fast_check)
        
        if res_data and 'error' not in res_data:
            v_lower = (res_data['verdict'] or "").lower()
            is_compilation = "compilation error" in v_lower
            if res_data.get('hasDetails') and is_compilation:
                logger.info("Fast path detected Compilation Error, falling back to stealth for details...")
                res_data = None
                
        if not res_data or 'error' in res_data:
            for attempt in range(1, 4):
                logger.info(f"Stealth status check attempt {attempt} for {req.submissionId}")
                res_data = await anyio.to_thread.run_sync(perform_stealth_check_with_details)
                if res_data and 'error' not in res_data:
                    break
                await anyio.sleep(2)

        if not res_data or 'error' in res_data:
            logger.error(f"Status check failed for {req.submissionId} after 3 attempts: {res_data}")
            return StatusResponse(success=False, error="SUBMISSION_NOT_FOUND")

        logger.info(f"Extracted row data for {req.submissionId}: {res_data}")

        # Parse time and memory strings
        time_ms = 0
        memory_kb = 0
        try:
            if res_data['time']:
                time_ms = int(re.search(r'(\d+)', res_data['time']).group(1))
            if res_data['memory']:
                memory_kb = int(re.search(r'(\d+)', res_data['memory']).group(1))
        except:
            pass

        # Extract test number
        test_number = None
        if res_data['verdict']:
            test_match = re.search(r'test\s+(\d+)', res_data['verdict'], re.I)
            if test_match:
                test_number = int(test_match.group(1))

        # Normalize verdict
        verdict_map = {
            "accepted": "OK",
            "happy new year!": "OK",
            "wrong answer": "WRONG_ANSWER",
            "compilation error": "COMPILATION_ERROR",
            "time limit exceeded": "TIME_LIMIT_EXCEEDED",
            "memory limit exceeded": "MEMORY_LIMIT_EXCEEDED",
            "runtime error": "RUNTIME_ERROR",
            "testing": "TESTING",
            "challenged": "CHALLENGED",
            "skipped": "SKIPPED",
            "partial": "PARTIAL",
        }
        
        normalized_verdict = res_data['verdict']
        if normalized_verdict:
            vl = normalized_verdict.lower()
            for key, val in verdict_map.items():
                if key in vl:
                    normalized_verdict = val
                    break

        return StatusResponse(
            success=True,
            verdict=normalized_verdict,
            time=time_ms,
            memory=memory_kb,
            testNumber=test_number,
            compilationError=res_data.get('compilationError'),
            details=res_data.get('details')
        )

    except Exception as e:
        logger.exception(f"Status check error: {e}")
        return StatusResponse(success=False, error=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)
