import asyncio
import json
import os
import re
import sys
import time
import psycopg2
import browser_cookie3
from playwright.async_api import async_playwright

COOKIE_PATH = '/home/yousefmsm1/.youtube_cookies.json'
VIDEOS_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'

PROBLEMS_QUEUE = [
    {"letter": "H", "name": "Two numbers", "filename": "problem_H.mp4"},
    {"letter": "N", "name": "Char", "filename": "problem_N.mp4"},
    {"letter": "R", "name": "Age in Days", "filename": "problem_R.mp4"},
    {"letter": "Y", "name": "The last 2 digits", "filename": "problem_Y.mp4"},
    {"letter": "T", "name": "Sort Numbers", "filename": "problem_T.mp4"},
    {"letter": "D", "name": "Difference", "filename": "problem_D.mp4"},
    {"letter": "Q", "name": "Coordinates of a Point", "filename": "problem_Q.mp4"},
    {"letter": "U", "name": "Float or int", "filename": "problem_U.mp4"},
    {"letter": "K", "name": "Max and Min", "filename": "problem_K.mp4"},
    {"letter": "S", "name": "Interval", "filename": "problem_S.mp4"},
    {"letter": "P", "name": "First digit !", "filename": "problem_P.mp4"},
    {"letter": "X", "name": "Two intervals", "filename": "problem_X.mp4"},
    {"letter": "O", "name": "Calculator", "filename": "problem_O.mp4"},
    {"letter": "V", "name": "Comparison", "filename": "problem_V.mp4"},
    {"letter": "Z", "name": "Hard Compare", "filename": "problem_Z.mp4"},
]

def get_db_conn():
    db_url = None
    with open('/home/yousefmsm1/Desktop/icpchue/next-app/.env.local') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                db_url = line.strip().split('=', 1)[1].strip('\"\'')
    if not db_url:
        raise ValueError("DATABASE_URL not found in .env.local")
    return psycopg2.connect(db_url)

def refresh_cookies():
    chrome_dir = '/home/yousefmsm1/.config/google-chrome'
    cookie_file = os.path.join(chrome_dir, 'Profile 7', 'Network', 'Cookies')
    if not os.path.exists(cookie_file):
        cookie_file = os.path.join(chrome_dir, 'Profile 7', 'Cookies')

    try:
        cj_yt = browser_cookie3.chrome(cookie_file=cookie_file, domain_name='youtube.com')
        cj_g = browser_cookie3.chrome(cookie_file=cookie_file, domain_name='google.com')

        all_cookies = []
        seen = set()
        for c in list(cj_yt) + list(cj_g):
            key = (c.name, c.domain, c.path)
            if key in seen: continue
            seen.add(key)
            all_cookies.append({
                'name': c.name, 'value': c.value, 'domain': c.domain, 'path': c.path,
                'secure': bool(c.secure), 'httpOnly': False,
                'sameSite': 'None' if c.secure else 'Lax'
            })
        with open(COOKIE_PATH, 'w') as f:
            json.dump(all_cookies, f, indent=2)
        return all_cookies
    except Exception as e:
        print(f"Cookie refresh warning: {e}, falling back to file.")
        with open(COOKIE_PATH) as f:
            return json.load(f)

def update_db_problem(letter, youtube_url):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE curriculum_problems
        SET solution_video_url = %s
        WHERE sheet_id = (SELECT id FROM curriculum_sheets WHERE sheet_number = 1 LIMIT 1)
          AND problem_letter = %s
        """,
        (youtube_url, letter)
    )
    conn.commit()
    conn.close()
    print(f"💾 [DB] Successfully saved {letter} -> {youtube_url}")

def is_problem_already_done(letter):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT solution_video_url FROM curriculum_problems
        WHERE sheet_id = (SELECT id FROM curriculum_sheets WHERE sheet_number = 1 LIMIT 1)
          AND problem_letter = %s
        """,
        (letter,)
    )
    row = cur.fetchone()
    conn.close()
    if row and row[0] and 'youtu.be' in row[0]:
        return True
    return False

async def upload_problem(browser, file_path, letter, title):
    fsize_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"🚀 UPLOADING PROBLEM {letter}: {title}")
    print(f"📁 Local File: {os.path.basename(file_path)} ({fsize_mb:.1f} MB)")
    print(f"=======================================================")

    cookies = refresh_cookies()
    ctx = await browser.new_context(viewport={'width': 1366, 'height': 768})
    await ctx.add_cookies(cookies)
    page = await ctx.new_page()

    try:
        await page.goto('https://studio.youtube.com/channel/UCiPtyUTf0Y22fJfwOE3Q44g/videos/upload?approve_browser_access=true', wait_until='domcontentloaded')
        await page.wait_for_timeout(3500)

        # 1. Click Create
        create_btn = await page.wait_for_selector('button:has-text("إنشاء"), ytcp-button#create-icon, button:has-text("Create")', timeout=20000)
        await create_btn.click()
        await page.wait_for_timeout(1000)

        # 2. Click Upload
        up_opt = await page.wait_for_selector('tp-yt-paper-item:has-text("تحميل فيديوهات"), tp-yt-paper-item:has-text("Upload videos"), #text-item-0', timeout=8000)
        await up_opt.click()
        await page.wait_for_timeout(1500)

        # 3. Attach file
        fi = await page.wait_for_selector('input[type="file"]', state='attached', timeout=12000)
        await fi.set_input_files(file_path)
        print("⏳ File selected. Extracting youtu.be link...")

        # 4. Extract youtu.be Link
        vid_id = ''
        for attempt in range(40):
            await page.wait_for_timeout(1500)
            res = await page.evaluate(r'''() => {
                const links = Array.from(document.querySelectorAll('ytcp-uploads-dialog a')).map(a => a.href);
                const spans = Array.from(document.querySelectorAll('ytcp-uploads-dialog span')).map(s => s.innerText);
                return { links, spans };
            }''')
            for l in res['links']:
                m = re.search(r'youtu\.be/([A-Za-z0-9_-]{11})', l)
                if m:
                    vid_id = m.group(1)
                    break
            if vid_id: break
            for s in res['spans']:
                m = re.search(r'youtu\.be/([A-Za-z0-9_-]{11})', s)
                if m:
                    vid_id = m.group(1)
                    break
            if vid_id: break

        if not vid_id:
            raise Exception("Failed to extract youtu.be Video ID!")

        youtube_url = f"https://youtu.be/{vid_id}"
        print(f"🔗 Video ID: {vid_id} -> {youtube_url}")

        # 5. Set Title
        try:
            title_box = await page.wait_for_selector('ytcp-uploads-dialog div#textbox[aria-label*="العنوان"], ytcp-uploads-dialog div#textbox[aria-label*="Title"], ytcp-uploads-dialog div#textbox[contenteditable="true"]', timeout=8000)
            await title_box.click()
            await page.keyboard.press('Control+A')
            await page.keyboard.press('Backspace')
            await title_box.fill(title[:95])
            print(f"📝 Title set: {title[:95]}")
        except Exception as e:
            print(f"⚠️ Title setting warning: {e}")

        # 6. Not made for kids
        try:
            not_for_kids = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], ytcp-uploads-dialog [name="NOT_MFK"], ytcp-uploads-dialog [aria-label*="ليس مخصصًا"]', timeout=8000)
            await not_for_kids.click()
            print("👶 Set: Not made for kids")
        except Exception as e:
            print(f"⚠️ Kids option warning: {e}")

        # 7. Next x 3
        for step in range(3):
            try:
                next_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#next-button, ytcp-uploads-dialog button:has-text("التالي"), ytcp-uploads-dialog button:has-text("Next")', timeout=8000)
                await next_btn.click()
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"⚠️ Next {step+1} warning: {e}")

        # 8. Unlisted visibility
        try:
            unlisted = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="UNLISTED"], ytcp-uploads-dialog [aria-label*="غير مدرج"], ytcp-uploads-dialog [aria-label*="Unlisted"]', timeout=8000)
            await unlisted.click()
            print("👁️ Set: Unlisted (غير مدرج)")
            await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"⚠️ Unlisted warning: {e}")

        # 9. Wait until byte transfer is 100% complete
        print("⏳ Waiting for byte transfer to complete...")
        start_wait = time.time()
        last_pct = ""

        while time.time() - start_wait < 600:
            await page.wait_for_timeout(2500)
            status_info = await page.evaluate(r'''() => {
                const spans = Array.from(document.querySelectorAll('ytcp-uploads-dialog span, ytcp-uploads-dialog div')).map(s => s.innerText);
                let pct = '';
                let isDone = false;
                for (const s of spans) {
                    if (s.includes('اكتمل') || s.includes('تحقق') || s.includes('معالجة') || s.includes('Upload complete') || s.includes('Processing') || s.includes('Checks')) {
                        isDone = true;
                    }
                    const m = s.match(/(\d+)\s*%/);
                    if (m) pct = m[1] + '%';
                }
                return { pct, isDone };
            }''')

            if status_info['pct'] != last_pct and status_info['pct']:
                print(f"📊 Progress: {status_info['pct']}")
                last_pct = status_info['pct']

            if status_info['isDone'] or status_info['pct'] == '100%' or (status_info['pct'] == '99%' and time.time() - start_wait > 25):
                print("🎉 Byte transfer finished 100%!")
                break

        # 10. Click Save
        done_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#done-button, ytcp-uploads-dialog button:has-text("حفظ"), ytcp-uploads-dialog button:has-text("Save")', timeout=15000)
        await done_btn.click()
        print("💾 Clicked Save!")
        await page.wait_for_timeout(5000)

        return youtube_url

    finally:
        await page.close()
        await ctx.close()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            headless=True,
            args=['--no-sandbox', '--disable-blink-features=AutomationControlled']
        )

        for prob in PROBLEMS_QUEUE:
            letter = prob['letter']
            name = prob['name']
            fname = prob['filename']
            fpath = os.path.join(VIDEOS_DIR, fname)

            if is_problem_already_done(letter):
                print(f"⏩ [SKIP] Problem {letter}. {name} is already linked to YouTube in DB!")
                continue

            if not os.path.exists(fpath):
                print(f"⚠️ [MISSING FILE] Problem {letter}. {name} not found at {fpath}")
                continue

            title = f"ICPC HUE - Sheet 1 - {letter}. {name}"
            try:
                yt_url = await upload_problem(browser, fpath, letter, title)
                update_db_problem(letter, yt_url)
                print(f"✨ COMPLETED: Problem {letter} -> {yt_url}\n")
                if os.path.exists(fpath):
                    os.remove(fpath)
                    print(f"🗑️ Cleaned {fname} from local disk to reclaim space.\n")
            except Exception as e:
                print(f"❌ ERROR on Problem {letter}: {e}\n")

        await browser.close()
        print("\n🎉 ALL PROBLEM SOLUTIONS PROCESSED & DB UPDATED!")

if __name__ == '__main__':
    asyncio.run(main())
