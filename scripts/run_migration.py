import asyncio
import json
import os
import re
import subprocess
import sys
from playwright.async_api import async_playwright

COOKIE_PATH = '/home/yousefmsm1/.youtube_cookies.json'
STATE_PATH = '/home/yousefmsm1/Desktop/migration_state.json'
PUBLISHED_DRAFTS_PATH = '/home/yousefmsm1/Desktop/published_drafts.json'
TEMP_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'

os.makedirs(TEMP_DIR, exist_ok=True)

# 1. Camp Sessions
CAMP_SESSIONS = [
    {"type": "camp", "camp": "level0", "slug": "data-types", "title": "ICPC HUE - Level 0 - 01: Data Types & I/O", "drive_id": "1Ihh7e6pxPbu5L8RobscDgfSVv-WJEE6g"},
    {"type": "camp", "camp": "level0", "slug": "revision", "title": "ICPC HUE - Level 0 - 02: Revision", "drive_id": "1sQT2Uk9A0FdDqn1gzBgvl8zn2rge3fe0"},
    {"type": "camp", "camp": "level0", "slug": "control-flow", "title": "ICPC HUE - Level 0 - 03: Control Flow", "drive_id": "1rm9v66HZd-_bZ7Z9KrpPbIIubBaqIa14"},
    {"type": "camp", "camp": "level0", "slug": "functions", "title": "ICPC HUE - Level 0 - 04: Functions", "drive_id": "12sTF5jj5S-w763CNt_k5XNpuAjYJC9Fk"},
    {"type": "camp", "camp": "level0", "slug": "recursion", "title": "ICPC HUE - Level 0 - 05: Recursion", "drive_id": "1bWcPjD6DEsCRKQ14Gk_M-1EHjvrKkD4C"},
    {"type": "camp", "camp": "level0", "slug": "arrays-and-adhocs", "title": "ICPC HUE - Level 0 - 06: Arrays & Ad-Hocs", "drive_id": "1lSj_AO1AijyMLAwayNFWbVTX81lfWHyY"},
    {"type": "camp", "camp": "level0", "slug": "complexity", "title": "ICPC HUE - Level 0 - 07: Complexity", "drive_id": "1nNM7Zd4DoZZB5js5Se3tzU9q0UPzneHb"},
    {"type": "camp", "camp": "level0", "slug": "contest-3", "title": "ICPC HUE - Level 0 - 08: Contest #3 Review", "drive_id": "1NpXBt2jPxwE6696h9UKnsdV5qtZKy5R4"},
    {"type": "camp", "camp": "programming1", "slug": "revision", "title": "ICPC HUE - Programming 1 - 01: Full Revision", "drive_id": "1wa6DS3f-PMTaGEmdnvuU7q-ILkE703ak"},
    {"type": "camp", "camp": "programming1", "slug": "exam-training", "title": "ICPC HUE - Programming 1 - 02: Exam Training", "drive_id": "1n3aiK4zG29WK6Si3NoJnnZKN-QvymCjR"},
    {"type": "camp", "camp": "level1", "slug": "time-complexity", "title": "ICPC HUE - Level 1 - 01: Time Complexity", "drive_id": "1fH4AIGqw3j6XSomagPB3CNwJVtM1YUxf"},
    {"type": "camp", "camp": "level1", "slug": "stl1", "title": "ICPC HUE - Level 1 - 02: STL 1", "drive_id": "1_oitAo2oKbimJ_eWBhX5WXHNOJY4CJN6"},
]

# 2. Problem Solutions (Sheet 1)
PROBLEM_SOLUTIONS = [
    {"type": "problem", "letter": "D", "title": "D Difference", "drive_id": "16u_b5uX9ZnGvVYkvb1K3yYjyTi3xGmoF"},
    {"type": "problem", "letter": "H", "title": "H Two numbers", "drive_id": "1GbKALQUC6l3uDWC0APJTqFQiORYQb8de"},
    {"type": "problem", "letter": "K", "title": "K Max and Min", "drive_id": "1t8mfdraZHpYnmEpyvQy1u8re8OFSMYgN"},
    {"type": "problem", "letter": "N", "title": "N Char", "drive_id": "1Ia2bzBB9jeX1YpvvGlXDZ-wCSOMZ4nfe"},
    {"type": "problem", "letter": "O", "title": "O Calculator", "drive_id": "1GDRpwkuNHVJk1IaC3av-XNpjCGfMS2Y4"},
    {"type": "problem", "letter": "P", "title": "P First digit !", "drive_id": "1Bu0ccRCL6yldRnJnT2zNIa-Uj28Yjup_"},
    {"type": "problem", "letter": "Q", "title": "Q Coordinates of a Point", "drive_id": "1mD3J7g4eAbWo_6DH-vGN8Ucor3p_0DrC"},
    {"type": "problem", "letter": "R", "title": "R Age in Days", "drive_id": "1ZtTxj8So1QEgBmeJeerkx_5HVAT6gjdK"},
    {"type": "problem", "letter": "S", "title": "S Interval", "drive_id": "1BnhbHZATm2Ydmf-_aDJfwzwGmIi-xBfs"},
    {"type": "problem", "letter": "T", "title": "T Sort Numbers", "drive_id": "1ezb7vg0Y15pPP0uvJlw1aLbtUep-JS3c"},
    {"type": "problem", "letter": "U", "title": "U Float or int", "drive_id": "1CZvF05-L_b2c97mxjtUyA0YjCFZyTu_u"},
    {"type": "problem", "letter": "V", "title": "V Comparison", "drive_id": "1L1mqYPKUzk_dPmG89Wxc3b_2qd0GXDGi"},
    {"type": "problem", "letter": "X", "title": "X Two intervals", "drive_id": "1icE2bzZy7prRSKfiGBi2bKmmlK8ySOaX"},
    {"type": "problem", "letter": "Y", "title": "Y The last 2 digits", "drive_id": "1i642_jX-zBf-3ZJnOLc0Rr4II14TLRld"},
    {"type": "problem", "letter": "Z", "title": "Z Hard Compare", "drive_id": "1ZGeFWfq2y1teDz-OGhvCfHphga1Yogd2"},
]

# 3. Tutorial Video
TUTORIAL_VIDEO = [
    {"type": "tutorial", "title": "ICPC HUE - Platform Tutorial", "drive_id": "1HAcSbtF1J9Hixk0JLd0oGiuFIiflT6I0"}
]

ALL_TASKS = CAMP_SESSIONS + PROBLEM_SOLUTIONS + TUTORIAL_VIDEO

state = {}
if os.path.exists(STATE_PATH):
    try:
        with open(STATE_PATH, 'r') as f:
            state = json.load(f)
    except Exception as e:
        print(f"Notice loading state: {e}")

# Also seed from published drafts if exists
if os.path.exists(PUBLISHED_DRAFTS_PATH):
    try:
        with open(PUBLISHED_DRAFTS_PATH) as f:
            drafts = json.load(f)
            for k, v in drafts.items():
                letter = v.get('letter')
                if letter and 'id' in v and v['id']:
                    state[letter] = {
                        "id": v["id"],
                        "url": v["url"],
                        "title": k,
                        "type": "problem"
                    }
    except Exception as e:
        print(f"Notice loading drafts: {e}")

def save_state():
    with open(STATE_PATH, 'w') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def download_video(drive_id, dest_file):
    print(f"\n[DOWNLOAD] Drive ID: {drive_id} -> {dest_file}")
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1024 * 1024:
        print(f"[DOWNLOAD] File already exists ({os.path.getsize(dest_file)} bytes), skipping download.")
        return True

    # 1. Try gdown first
    cmd = ["/home/yousefmsm1/.local/bin/gdown", f"https://drive.google.com/uc?id={drive_id}", "-O", dest_file]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1024 * 1024:
        print(f"[DOWNLOAD] Downloaded successfully via gdown ({os.path.getsize(dest_file)} bytes).")
        return True

    # 2. Fallback to yt-dlp
    print(f"[DOWNLOAD] gdown could not download directly, attempting fallback via yt-dlp...")
    ytdlp_cmd = [
        "/home/yousefmsm1/.local/bin/yt-dlp",
        "--no-update",
        "-f", "bestvideo+bestaudio/best",
        "-o", dest_file,
        f"https://drive.google.com/file/d/{drive_id}/view"
    ]
    res_yt = subprocess.run(ytdlp_cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1024 * 1024:
        print(f"[DOWNLOAD] Downloaded successfully via yt-dlp ({os.path.getsize(dest_file)} bytes).")
        return True

    print(f"[DOWNLOAD FAILED] gdown: {res.stderr.strip()}\nyt-dlp: {res_yt.stderr.strip()}")
    return False

async def upload_video(page, file_path, title):
    print(f"[UPLOAD] Starting YouTube upload for: '{title}' ({file_path})")
    await page.goto(
        'https://studio.youtube.com/channel/UCiPtyUTf0Y22fJfwOE3Q44g/videos/upload?filter=%5B%5D&sort=%7B%22columnType%22%3A%22date%22%2C%22sortOrder%22%3A%22DESCENDING%22%7D',
        wait_until='networkidle'
    )
    await page.wait_for_timeout(2500)

    # 1. Click Create
    create_btn = await page.wait_for_selector('ytcp-button#create-icon, button:has-text("إنشاء"), button:has-text("Create")', timeout=15000)
    await create_btn.click()
    await page.wait_for_timeout(1000)

    # 2. Click Upload Videos
    upload_opt = await page.wait_for_selector('tp-yt-paper-item:has-text("تحميل فيديوهات"), tp-yt-paper-item:has-text("Upload videos"), #text-item-0', timeout=8000)
    await upload_opt.click()
    await page.wait_for_timeout(1500)

    # 3. Attach file
    file_input = await page.wait_for_selector('input[type="file"]', state='attached', timeout=12000)
    await file_input.set_input_files(file_path)
    print("[UPLOAD] File selected! Waiting for YouTube processing...")
    await page.wait_for_timeout(5000)

    # 4. Extract assigned Video Link & ID
    link_elem = await page.wait_for_selector('a.ytcp-video-info, span.video-url-fadeable, [href*="youtu.be"], a[href*="watch?v="]', timeout=45000)
    href = await link_elem.get_attribute('href') or ''
    text = await link_elem.inner_text() or ''
    target_str = href if 'youtu.be/' in href or 'watch?v=' in href else text

    vid_id = ''
    url = ''
    if 'youtu.be/' in target_str:
        vid_id = target_str.split('youtu.be/')[1].split('?')[0].split('&')[0].strip()
        url = f"https://youtu.be/{vid_id}"
    elif 'watch?v=' in target_str:
        vid_id = target_str.split('watch?v=')[1].split('&')[0].strip()
        url = f"https://youtu.be/{vid_id}"

    if not vid_id:
        m = re.search(r'([A-Za-z0-9_-]{11})', target_str)
        if m:
            vid_id = m.group(1)
            url = f"https://youtu.be/{vid_id}"

    print(f"[UPLOAD] Video ID: {vid_id} | URL: {url}")

    # 5. Set Title
    try:
        title_box = await page.wait_for_selector('div#textbox[aria-label*="العنوان"], div#textbox[aria-label*="Title"], div#textbox[contenteditable="true"]', timeout=10000)
        await title_box.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        await title_box.fill(title[:95])
        print(f"[UPLOAD] Title set to: {title[:95]}")
    except Exception as e:
        print(f"[UPLOAD] Warning setting title: {e}")

    # 6. Not for kids
    try:
        not_for_kids = await page.wait_for_selector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="NOT_MFK"], [aria-label*="ليس مخصصًا للأطفال"]', timeout=8000)
        await not_for_kids.click()
    except Exception as e:
        print(f"[UPLOAD] Not for kids warning: {e}")

    # 7. Next buttons (3 times)
    for step in range(3):
        try:
            next_btn = await page.wait_for_selector('ytcp-button#next-button, button:has-text("التالي"), button:has-text("Next")', timeout=7000)
            await next_btn.click()
            await page.wait_for_timeout(1200)
        except Exception as e:
            print(f"[UPLOAD] Next step {step+1} warning: {e}")

    # 8. Unlisted (غير مدرج)
    try:
        unlisted = await page.wait_for_selector('tp-yt-paper-radio-button[name="UNLISTED"], [aria-label*="غير مدرج"], [aria-label*="Unlisted"]', timeout=8000)
        await unlisted.click()
        await page.wait_for_timeout(1000)
        print("[UPLOAD] Selected 'Unlisted' visibility.")
    except Exception as e:
        print(f"[UPLOAD] Unlisted selection error: {e}")

    # 9. Save
    save_btn = await page.wait_for_selector('ytcp-button#done-button, button:has-text("حفظ"), button:has-text("Save")', timeout=10000)
    await save_btn.click()
    print("[UPLOAD] Clicked Save! Waiting 5s...")
    await page.wait_for_timeout(5000)

    # 10. Dismiss dialog / close button
    try:
        close_btn = await page.wait_for_selector('ytcp-button#close-button, button:has-text("إغلاق"), button:has-text("Close")', timeout=6000)
        await close_btn.click()
        await page.wait_for_timeout(1000)
    except:
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(500)
        await page.keyboard.press('Escape')

    return {"id": vid_id, "url": url}

def update_db_problem(letter, youtube_url):
    cmd = [
        "node", "--env-file=.env.local", "-e",
        f"const {{ Pool }} = require('pg');"
        f"const pool = new Pool({{ connectionString: process.env.DATABASE_URL }});"
        f"pool.query('UPDATE curriculum_problems SET solution_video_url = $1 WHERE contest_id = \\'219158\\' AND problem_letter = $2', ['{youtube_url}', '{letter}'])"
        f".then(() => {{ console.log('[DB] Updated DB for problem {letter} -> {youtube_url}'); pool.end(); }})"
        f".catch(e => {{ console.error('[DB ERROR] Problem {letter}:', e.message); pool.end(); }});"
    ]
    res = subprocess.run(cmd, cwd='/home/yousefmsm1/Desktop/icpchue/next-app', capture_output=True, text=True)
    print(res.stdout.strip() or res.stderr.strip())

def update_session_file(drive_id, youtube_id):
    path = '/home/yousefmsm1/Desktop/icpchue/next-app/lib/sessionData.tsx'
    with open(path, 'r') as f:
        content = f.read()

    target = f"videoId: '{drive_id}'"
    replacement = f"videoId: '{youtube_id}'"

    if target in content:
        new_content = content.replace(target, replacement, 1)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"[CODE] Updated sessionData.tsx: {drive_id} -> {youtube_id}")
    else:
        print(f"[CODE WARNING] '{target}' not found in sessionData.tsx")

def update_team_tutorial(youtube_url):
    path = '/home/yousefmsm1/Desktop/icpchue/next-app/app/team/page.tsx'
    with open(path, 'r') as f:
        content = f.read()

    old_url = 'https://drive.google.com/file/d/1HAcSbtF1J9Hixk0JLd0oGiuFIiflT6I0/view?usp=sharing'
    if old_url in content:
        new_content = content.replace(old_url, youtube_url)
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"[CODE] Updated team/page.tsx tutorial link -> {youtube_url}")
    else:
        print(f"[CODE WARNING] Tutorial drive link not found in team/page.tsx")

async def main():
    with open(COOKIE_PATH) as f:
        raw_cookies = json.load(f)

    playwright_cookies = []
    for c in raw_cookies:
        cookie = {
            'name': c['name'],
            'value': c['value'],
            'domain': c.get('domain', '.youtube.com'),
            'path': c.get('path', '/'),
            'secure': c.get('secure', True),
            'httpOnly': c.get('httpOnly', False),
        }
        same_site = c.get('sameSite')
        if same_site in ['Strict', 'Lax', 'None']:
            cookie['sameSite'] = same_site
        elif same_site == 'no_restriction':
            cookie['sameSite'] = 'None'
        playwright_cookies.append(cookie)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            viewport={'width': 1366, 'height': 768},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
        )
        await context.add_cookies(playwright_cookies)
        page = await context.new_page()

        total = len(ALL_TASKS)
        print(f"Total tasks to check/process: {total}")

        for idx, task in enumerate(ALL_TASKS, 1):
            key = task.get('letter') or f"{task.get('camp')}_{task.get('slug')}" or task.get('title')
            print(f"\n==================================================")
            print(f"[{idx}/{total}] Task: {task['title']} (Key: {key})")
            print(f"==================================================")

            if key in state and state[key].get('id'):
                print(f"[SKIP] Already completed: {state[key]['url']} (ID: {state[key]['id']})")
                continue

            dest_filename = f"temp_{idx}_{task.get('slug') or task.get('letter') or 'tutorial'}.mp4"
            local_path = os.path.join(TEMP_DIR, dest_filename)

            # 1. Download
            downloaded = download_video(task['drive_id'], local_path)
            if not downloaded:
                print(f"[ERROR] Failed download for {task['title']}, skipping.")
                continue

            # 2. Upload
            try:
                upload_res = await upload_video(page, local_path, task['title'])
                vid_id = upload_res['id']
                vid_url = upload_res['url']

                if not vid_id:
                    raise Exception("No Video ID extracted from YouTube Studio.")

                state[key] = {
                    "id": vid_id,
                    "url": vid_url,
                    "title": task["title"],
                    "type": task["type"],
                }
                save_state()

                # 3. Update database or source files
                if task["type"] == "problem" and task.get("letter"):
                    update_db_problem(task["letter"], vid_url)
                elif task["type"] == "camp" and task.get("drive_id"):
                    update_session_file(task["drive_id"], vid_id)
                elif task["type"] == "tutorial":
                    update_team_tutorial(vid_url)

                # 4. Immediate Cleanup of local file
                if os.path.exists(local_path):
                    os.remove(local_path)
                    print(f"[CLEANUP] Deleted temporary video file: {local_path}")

            except Exception as e:
                print(f"[ERROR] Upload failed for {task['title']}: {e}")
                screenshot_path = os.path.join(TEMP_DIR, f"error_{key}.png")
                try:
                    await page.screenshot(path=screenshot_path)
                    print(f"[DEBUG] Saved error screenshot: {screenshot_path}")
                except:
                    pass
                if os.path.exists(local_path):
                    os.remove(local_path)

        await browser.close()
        print("\n🎉 ALL VIDEOS PROCESSED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(main())
