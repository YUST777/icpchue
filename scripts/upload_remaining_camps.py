import asyncio
import json
import os
import re
import sys
import time
import browser_cookie3
from playwright.async_api import async_playwright

TEMP_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'
SESSION_DATA_PATH = '/home/yousefmsm1/Desktop/icpchue/next-app/lib/sessionData.tsx'
P7_COOKIE_PATH = '/home/yousefmsm1/.config/google-chrome/Profile 7/Cookies'
FALLBACK_COOKIE_PATH = '/home/yousefmsm1/.youtube_cookies.json'

REMAINING_CAMPS = [
    {
        "camp": "level0",
        "slug": "complexity",
        "title": "ICPC HUE - Level 0 - 07: Complexity",
        "drive_id": "1nNM7Zd4DoZZB5js5Se3tzU9q0UPzneHb",
        "filename": "temp_7_complexity.mp4"
    },
    {
        "camp": "level0",
        "slug": "contest-3",
        "title": "ICPC HUE - Level 0 - 08: Contest #3 Review",
        "drive_id": "1NpXBt2jPxwE6696h9UKnsdV5qtZKy5R4",
        "filename": "temp_8_contest3.mp4"
    },
    {
        "camp": "programming1",
        "slug": "revision",
        "title": "ICPC HUE - Programming 1 - 01: Full Revision",
        "drive_id": "1wa6DS3f-PMTaGEmdnvuU7q-ILkE703ak",
        "filename": "temp_pro1_1_revision.mp4"
    },
    {
        "camp": "programming1",
        "slug": "exam-training",
        "title": "ICPC HUE - Programming 1 - 02: Exam Training",
        "drive_id": "1n3aiK4zG29WK6Si3NoJnnZKN-QvymCjR",
        "filename": "temp_pro1_2_exam.mp4"
    },
    {
        "camp": "level1",
        "slug": "time-complexity",
        "title": "ICPC HUE - Level 1 - 01: Time Complexity",
        "drive_id": "1fH4AIGqw3j6XSomagPB3CNwJVtM1YUxf",
        "filename": "temp_level1_1_time.mp4"
    },
    {
        "camp": "level1",
        "slug": "stl1",
        "title": "ICPC HUE - Level 1 - 02: STL 1",
        "drive_id": "1_oitAo2oKbimJ_eWBhX5WXHNOJY4CJN6",
        "filename": "temp_level1_2_stl1.mp4"
    },
]

def get_cookies():
    playwright_cookies = []
    try:
        cj = browser_cookie3.chrome(cookie_file=P7_COOKIE_PATH, domain_name='.youtube.com')
        for c in cj:
            cookie = {
                'name': c.name, 'value': c.value, 'domain': c.domain, 'path': c.path,
                'secure': bool(c.secure), 'httpOnly': bool(c.has_nonstandard_attr('HttpOnly') or c.has_nonstandard_attr('httponly'))
            }
            s = getattr(c, 'sameSite', None)
            if s in ['Strict', 'Lax', 'None']: cookie['sameSite'] = s
            elif s in ['no_restriction', 'None']: cookie['sameSite'] = 'None'
            elif s == 'lax': cookie['sameSite'] = 'Lax'
            playwright_cookies.append(cookie)

        try:
            cj_g = browser_cookie3.chrome(cookie_file=P7_COOKIE_PATH, domain_name='.google.com')
            for c in cj_g:
                playwright_cookies.append({'name': c.name, 'value': c.value, 'domain': c.domain, 'path': c.path, 'secure': bool(c.secure), 'httpOnly': False})
        except:
            pass

        print(f"[AUTH] Loaded {len(playwright_cookies)} live cookies from Chrome Profile 7")
        return playwright_cookies
    except Exception as e:
        print(f"[AUTH WARNING] Failed to read Profile 7 cookies: {e}. Trying fallback JSON...")
        with open(FALLBACK_COOKIE_PATH) as f:
            raw = json.load(f)
        for c in raw:
            playwright_cookies.append({
                'name': c['name'], 'value': c['value'], 'domain': c.get('domain', '.youtube.com'), 'path': c.get('path', '/'),
                'secure': c.get('secure', True), 'httpOnly': c.get('httpOnly', False)
            })
        return playwright_cookies

def update_session_file(drive_id, youtube_id):
    with open(SESSION_DATA_PATH, 'r') as f:
        content = f.read()

    target = f"videoId: '{drive_id}'"
    replacement = f"videoId: '{youtube_id}'"

    if target in content:
        new_content = content.replace(target, replacement, 1)
        with open(SESSION_DATA_PATH, 'w') as f:
            f.write(new_content)
        print(f"[CODE] Updated sessionData.tsx: {drive_id} -> {youtube_id}")
        return True
    else:
        print(f"[CODE WARNING] '{target}' not found in sessionData.tsx (might already be updated)")
        return False

def is_already_done(drive_id):
    with open(SESSION_DATA_PATH, 'r') as f:
        content = f.read()
    return f"videoId: '{drive_id}'" not in content

async def upload_single(page, file_path, title):
    print(f"\n[UPLOAD] Uploading: '{title}' ({os.path.getsize(file_path)} bytes)")
    
    # 1. Navigate to Studio Videos list with approve_browser_access flag
    await page.goto('https://studio.youtube.com/channel/UCiPtyUTf0Y22fJfwOE3Q44g/videos/upload?approve_browser_access=true', wait_until='networkidle')
    await page.wait_for_timeout(2500)

    # 2. Click Create
    create_btn = await page.wait_for_selector('button:has-text("إنشاء"), ytcp-button#create-icon', timeout=15000)
    await create_btn.click()
    await page.wait_for_timeout(1000)

    # 3. Click Upload Videos
    up_opt = await page.wait_for_selector('tp-yt-paper-item:has-text("تحميل فيديوهات"), tp-yt-paper-item:has-text("Upload videos"), #text-item-0', timeout=8000)
    await up_opt.click()
    await page.wait_for_timeout(1500)

    # 4. Attach file
    fi = await page.wait_for_selector('input[type="file"]', state='attached', timeout=12000)
    await fi.set_input_files(file_path)
    print("[UPLOAD] Selected file, waiting 3s...")
    await page.wait_for_timeout(3000)

    # 5. Check if resume modal appeared
    try:
        cancel_modal = await page.wait_for_selector('ytcp-confirmation-dialog #cancel-button, ytcp-confirmation-dialog button:has-text("إلغاء")', timeout=3000)
        if cancel_modal:
            print("[UPLOAD WARNING] Resume modal appeared, clicking cancel and re-attaching file...")
            await cancel_modal.click()
            await page.wait_for_timeout(1500)
            fi = await page.wait_for_selector('input[type="file"]', state='attached', timeout=8000)
            await fi.set_input_files(file_path)
            await page.wait_for_timeout(3000)
    except:
        pass

    # 6. Extract Video ID from dialog
    link_elem = await page.wait_for_selector('ytcp-uploads-dialog a.ytcp-video-info, ytcp-uploads-dialog [href*="youtu.be"], ytcp-uploads-dialog span.video-url-fadeable', timeout=60000)
    href = await link_elem.get_attribute('href') or ''
    text = await link_elem.inner_text() or ''
    target_str = href if 'youtu.be/' in href else text
    print(f"[UPLOAD] Link text: {target_str}")

    vid_id = ''
    if 'youtu.be/' in target_str:
        vid_id = target_str.split('youtu.be/')[1].split('?')[0].split('&')[0].strip()
    elif re.search(r'([A-Za-z0-9_-]{11})', target_str):
        vid_id = re.search(r'([A-Za-z0-9_-]{11})', target_str).group(1)

    if not vid_id:
        raise Exception(f"Failed to extract 11-char Video ID from: {target_str}")

    print(f"[UPLOAD] Video ID Assigned: {vid_id} -> https://youtu.be/{vid_id}")

    # 7. Set Title
    try:
        title_box = await page.wait_for_selector('ytcp-uploads-dialog div#textbox[aria-label*="العنوان"], ytcp-uploads-dialog div#textbox[aria-label*="Title"], ytcp-uploads-dialog div#textbox[contenteditable="true"]', timeout=10000)
        await title_box.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        await title_box.fill(title[:95])
        print(f"[UPLOAD] Title set: {title[:95]}")
    except Exception as e:
        print(f"[UPLOAD] Title warning: {e}")

    # 8. Not made for kids
    try:
        not_for_kids = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], ytcp-uploads-dialog [name="NOT_MFK"], ytcp-uploads-dialog [aria-label*="ليس مخصصًا"]', timeout=8000)
        await not_for_kids.click()
        print("[UPLOAD] Set not made for kids.")
    except Exception as e:
        print(f"[UPLOAD] Kids option warning: {e}")

    # 9. Next buttons x 3
    for step in range(3):
        try:
            next_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#next-button, ytcp-uploads-dialog button:has-text("التالي"), ytcp-uploads-dialog button:has-text("Next")', timeout=8000)
            await next_btn.click()
            await page.wait_for_timeout(1000)
            print(f"[UPLOAD] Clicked Next ({step+1}/3)")
        except Exception as e:
            print(f"[UPLOAD] Next button step {step+1} warning: {e}")

    # 10. Select Unlisted
    try:
        unlisted = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="UNLISTED"], ytcp-uploads-dialog [aria-label*="غير مدرج"], ytcp-uploads-dialog [aria-label*="Unlisted"]', timeout=8000)
        await unlisted.click()
        print("[UPLOAD] Selected Unlisted.")
        await page.wait_for_timeout(1000)
    except Exception as e:
        print(f"[UPLOAD] Unlisted selection warning: {e}")

    # 11. Click Save / Done
    done_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#done-button, ytcp-uploads-dialog button:has-text("حفظ"), ytcp-uploads-dialog button:has-text("Save")', timeout=15000)
    await done_btn.click()
    print("[UPLOAD] Clicked Save! Waiting 6s...")
    await page.wait_for_timeout(6000)

    # 12. Close / Dismiss Dialog
    try:
        close_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#close-button, ytcp-button#close-button, button:has-text("إغلاق")', timeout=6000)
        await close_btn.click()
        print("[UPLOAD] Dialog closed.")
    except:
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(500)
        await page.keyboard.press('Escape')

    return vid_id

async def main():
    cookies = get_cookies()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            viewport={'width': 1366, 'height': 768},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.47 Safari/537.36'
        )
        await context.add_cookies(cookies)
        page = await context.new_page()

        total = len(REMAINING_CAMPS)
        print(f"\n==================================================")
        print(f"Starting Upload for {total} Remaining Camp Sessions")
        print(f"==================================================")

        for idx, task in enumerate(REMAINING_CAMPS, 1):
            key = f"{task['camp']}_{task['slug']}"
            print(f"\n>>> [{idx}/{total}] Processing: {task['title']} ({key})")

            if is_already_done(task['drive_id']):
                print(f"[SKIP] Already updated in sessionData.tsx!")
                continue

            local_path = os.path.join(TEMP_DIR, task['filename'])
            if not os.path.exists(local_path):
                print(f"[ERROR] Local file not found: {local_path}!")
                continue

            success = False
            for attempt in range(2):
                try:
                    vid_id = await upload_single(page, local_path, task['title'])
                    update_session_file(task['drive_id'], vid_id)
                    
                    if os.path.exists(local_path):
                        os.remove(local_path)
                        print(f"[CLEANUP] Deleted {local_path} to free disk space!")

                    print(f"✅ SUCCESSFULLY MIGRATED: {task['title']} -> https://youtu.be/{vid_id}\n")
                    success = True
                    break
                except Exception as e:
                    print(f"[ERROR] Attempt {attempt+1} failed for {task['title']}: {e}")
                    ss_path = os.path.join(TEMP_DIR, f"fail_{key}_att{attempt+1}.png")
                    try:
                        await page.screenshot(path=ss_path)
                        print(f"[DEBUG] Saved fail screenshot: {ss_path}")
                    except:
                        pass
                    await page.wait_for_timeout(3000)

            if not success:
                print(f"❌ Failed migrating {task['title']} after 2 attempts.")

        await browser.close()
        print("\n🏁 ALL REMAINING CAMP SESSIONS FINISHED!")

if __name__ == '__main__':
    asyncio.run(main())
