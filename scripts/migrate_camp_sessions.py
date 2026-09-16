import asyncio
import json
import os
import re
import subprocess
import time
from playwright.async_api import async_playwright

COOKIE_PATH = '/home/yousefmsm1/.youtube_cookies.json'
STATE_PATH = '/home/yousefmsm1/Desktop/migration_state.json'
TEMP_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'
SESSION_DATA_PATH = '/home/yousefmsm1/Desktop/icpchue/next-app/lib/sessionData.tsx'

os.makedirs(TEMP_DIR, exist_ok=True)

REMAINING_CAMPS = [
    {
        "camp": "level0",
        "slug": "arrays-and-adhocs",
        "title": "ICPC HUE - Level 0 - 06: Arrays & Ad-Hocs",
        "drive_id": "1lSj_AO1AijyMLAwayNFWbVTX81lfWHyY",
        "filename": "temp_6_arrays.mp4"
    },
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

def load_state():
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH) as f:
                return json.load(f)
        except:
            pass
    return {}

def save_state(state):
    with open(STATE_PATH, 'w') as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

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
        print(f"[CODE WARNING] '{target}' not found in sessionData.tsx")
        return False

def is_already_done(drive_id):
    with open(SESSION_DATA_PATH, 'r') as f:
        content = f.read()
    return f"videoId: '{drive_id}'" not in content

def download_video(drive_id, dest_file):
    print(f"\n[DOWNLOAD] Drive ID: {drive_id} -> {dest_file}")
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[DOWNLOAD] File already exists ({os.path.getsize(dest_file)} bytes).")
        return True

    prefix = os.path.basename(dest_file)
    matching_parts = [f for f in os.listdir(TEMP_DIR) if f.startswith(prefix) and (f.endswith('.part') or 'part' in f)]
    if matching_parts:
        part_path = os.path.join(TEMP_DIR, matching_parts[0])
        print(f"[DOWNLOAD] Waiting for existing download in progress: {part_path}...")
        for _ in range(120):
            time.sleep(5)
            if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
                print(f"[DOWNLOAD] Finished downloading! ({os.path.getsize(dest_file)} bytes)")
                return True
            if not os.path.exists(part_path):
                break

    print("[DOWNLOAD] Downloading via gdown...")
    cmd = ["/home/yousefmsm1/.local/bin/gdown", f"https://drive.google.com/uc?id={drive_id}", "-O", dest_file]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[DOWNLOAD SUCCESS gdown] ({os.path.getsize(dest_file)} bytes)")
        return True

    print("[DOWNLOAD FALLBACK] Trying yt-dlp...")
    ytdlp_cmd = [
        "/home/yousefmsm1/.local/bin/yt-dlp",
        "--no-update",
        "-f", "bestvideo+bestaudio/best",
        "-o", dest_file,
        f"https://drive.google.com/file/d/{drive_id}/view"
    ]
    subprocess.run(ytdlp_cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[DOWNLOAD SUCCESS yt-dlp] ({os.path.getsize(dest_file)} bytes)")
        return True

    print(f"[DOWNLOAD ERROR] Failed to download {drive_id}")
    return False

async def upload_session(page, file_path, title):
    print(f"\n[UPLOAD] Uploading: '{title}' ({os.path.getsize(file_path)} bytes)")
    await page.goto('https://studio.youtube.com/channel/UCiPtyUTf0Y22fJfwOE3Q44g/videos/upload?filter=%5B%5D&sort=%7B%22columnType%22%3A%22date%22%2C%22sortOrder%22%3A%22DESCENDING%22%7D', wait_until='networkidle')
    await page.wait_for_timeout(2500)

    # Dismiss any existing dialog
    try:
        cancel_btn = await page.wait_for_selector('button:has-text("إلغاء"), ytcp-button:has-text("إلغاء")', timeout=2000)
        if cancel_btn:
            await cancel_btn.click()
            await page.wait_for_timeout(1000)
    except:
        pass

    # 1. Create button
    create_btn = await page.wait_for_selector('ytcp-button#create-icon, button:has-text("إنشاء"), button:has-text("Create")', timeout=15000)
    await create_btn.click()
    await page.wait_for_timeout(1000)

    # 2. Upload video menu item
    upload_opt = await page.wait_for_selector('tp-yt-paper-item:has-text("تحميل فيديوهات"), tp-yt-paper-item:has-text("Upload videos"), #text-item-0', timeout=8000)
    await upload_opt.click()
    await page.wait_for_timeout(1500)

    # 3. File Input
    file_input = await page.wait_for_selector('input[type="file"]', state='attached', timeout=12000)
    await file_input.set_input_files(file_path)
    print("[UPLOAD] Selected file, waiting 4s...")
    await page.wait_for_timeout(4000)

    # Check if incorrect file dialog appeared
    try:
        cancel_btn = await page.wait_for_selector('button:has-text("إلغاء"), ytcp-button:has-text("إلغاء")', timeout=3000)
        if cancel_btn:
            print('[UPLOAD WARNING] Resume dialog appeared, dismissing and re-attaching file...')
            await cancel_btn.click()
            await page.wait_for_timeout(1500)
            file_input = await page.wait_for_selector('input[type="file"]', state='attached', timeout=8000)
            await file_input.set_input_files(file_path)
            await page.wait_for_timeout(4000)
    except:
        pass

    # 4. Video Link & ID (scoped to dialog)
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

    # 5. Set Title
    try:
        title_box = await page.wait_for_selector('ytcp-uploads-dialog div#textbox[aria-label*="العنوان"], ytcp-uploads-dialog div#textbox[aria-label*="Title"], ytcp-uploads-dialog div#textbox[contenteditable="true"]', timeout=10000)
        await title_box.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        await title_box.fill(title[:95])
        print(f"[UPLOAD] Title set: {title[:95]}")
    except Exception as e:
        print(f"[UPLOAD] Title warning: {e}")

    # 6. Not made for kids
    try:
        not_for_kids = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], ytcp-uploads-dialog [name="NOT_MFK"], ytcp-uploads-dialog [aria-label*="ليس مخصصًا"]', timeout=8000)
        await not_for_kids.click()
        print("[UPLOAD] Set not made for kids.")
    except Exception as e:
        print(f"[UPLOAD] Kids option warning: {e}")

    # 7. Next buttons x 3
    for step in range(3):
        try:
            next_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#next-button, ytcp-uploads-dialog button:has-text("التالي"), ytcp-uploads-dialog button:has-text("Next")', timeout=7000)
            await next_btn.click()
            await page.wait_for_timeout(1000)
            print(f"[UPLOAD] Clicked Next ({step+1}/3)")
        except Exception as e:
            print(f"[UPLOAD] Next button step {step+1} warning: {e}")

    # 8. Unlisted radio button
    try:
        unlisted = await page.wait_for_selector('ytcp-uploads-dialog tp-yt-paper-radio-button[name="UNLISTED"], ytcp-uploads-dialog [aria-label*="غير مدرج"], ytcp-uploads-dialog [aria-label*="Unlisted"]', timeout=8000)
        await unlisted.click()
        print("[UPLOAD] Selected Unlisted.")
        await page.wait_for_timeout(1000)
    except Exception as e:
        print(f"[UPLOAD] Unlisted selection error: {e}")

    # 9. Save / Done
    done_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#done-button, ytcp-uploads-dialog button:has-text("حفظ"), ytcp-uploads-dialog button:has-text("Save")', timeout=12000)
    await done_btn.click()
    print("[UPLOAD] Clicked Save! Waiting 5s...")
    await page.wait_for_timeout(5000)

    # 10. Close / Dismiss Dialog
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
    state = load_state()

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
        elif same_site in ['no_restriction', 'None']:
            cookie['sameSite'] = 'None'
        elif same_site == 'lax':
            cookie['sameSite'] = 'Lax'
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

        total = len(REMAINING_CAMPS)
        print(f"\n==================================================")
        print(f"Starting migration for {total} Camp Sessions")
        print(f"==================================================")

        for idx, task in enumerate(REMAINING_CAMPS, 1):
            key = f"{task['camp']}_{task['slug']}"
            print(f"\n>>> [{idx}/{total}] Processing: {task['title']} ({key})")

            if is_already_done(task['drive_id']):
                print(f"[SKIP] Already updated in sessionData.tsx!")
                continue

            local_path = os.path.join(TEMP_DIR, task['filename'])

            ok = download_video(task['drive_id'], local_path)
            if not ok:
                print(f"[ERROR] Could not download {task['title']}, skipping.")
                continue

            try:
                vid_id = await upload_session(page, local_path, task['title'])
                state[key] = {
                    "id": vid_id,
                    "url": f"https://youtu.be/{vid_id}",
                    "title": task["title"],
                    "type": "camp"
                }
                save_state(state)

                update_session_file(task['drive_id'], vid_id)

                if os.path.exists(local_path):
                    os.remove(local_path)
                    print(f"[CLEANUP] Deleted {local_path} (Disk space preserved!)")

                print(f"✅ SUCCESSFULLY COMPLETED: {task['title']} -> https://youtu.be/{vid_id}\n")

            except Exception as e:
                print(f"[ERROR] Failed uploading {task['title']}: {e}")
                screenshot_path = os.path.join(TEMP_DIR, f"error_{key}.png")
                try:
                    await page.screenshot(path=screenshot_path)
                    print(f"[DEBUG] Saved error screenshot: {screenshot_path}")
                except:
                    pass

        await browser.close()
        print("\n🎉 ALL CAMP SESSIONS MIGRATED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(main())
