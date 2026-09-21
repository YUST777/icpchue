import asyncio
import json
import os
import re
import sys
import time
from playwright.async_api import async_playwright

COOKIE_PATH = '/home/yousefmsm1/.youtube_cookies.json'
SESSION_DATA_PATH = '/home/yousefmsm1/Desktop/icpchue/next-app/lib/sessionData.tsx'
VIDEOS_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'

CAMPS_TO_UPLOAD = [
    {
        "title": "ICPC HUE - Level 1 - 01: Time Complexity",
        "drive_id": "1fH4AIGqw3j6XSomagPB3CNwJVtM1YUxf",
        "filename": "temp_level1_1_time.mp4"
    },
    {
        "title": "ICPC HUE - Level 1 - 02: STL 1",
        "drive_id": "1_oitAo2oKbimJ_eWBhX5WXHNOJY4CJN6",
        "filename": "temp_level1_2_stl1.mp4"
    }
]

def get_cookies():
    with open(COOKIE_PATH) as f:
        raw = json.load(f)
    cookies = []
    for c in raw:
        cookie = {
            'name': c['name'], 'value': c['value'], 'domain': c.get('domain', '.youtube.com'), 'path': c.get('path', '/'),
            'secure': bool(c.get('secure', True)), 'httpOnly': bool(c.get('httpOnly', False))
        }
        s = c.get('sameSite')
        if s:
            if s.lower() in ['none', 'no_restriction']: cookie['sameSite'] = 'None'
            elif s.lower() == 'lax': cookie['sameSite'] = 'Lax'
            elif s.lower() == 'strict': cookie['sameSite'] = 'Strict'
        cookies.append(cookie)
    return cookies

def update_session_file(drive_id, youtube_id):
    with open(SESSION_DATA_PATH, 'r') as f:
        content = f.read()

    target = f"videoId: '{drive_id}'"
    replacement = f"videoId: '{youtube_id}'"

    if target in content:
        new_content = content.replace(target, replacement, 1)
        with open(SESSION_DATA_PATH, 'w') as f:
            f.write(new_content)
        print(f"✅ [CODE] Updated sessionData.tsx: {drive_id} -> {youtube_id}")
        return True
    else:
        print(f"⚠️ [CODE] Target '{target}' not found in sessionData.tsx (maybe already updated?)")
        return False

async def upload_single_video(browser, task):
    local_path = os.path.join(VIDEOS_DIR, task['filename'])
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"Video file not found: {local_path}")

    fsize_mb = os.path.getsize(local_path) / (1024 * 1024)
    print(f"\n=======================================================")
    print(f"🚀 UPLOADING: {task['title']}")
    print(f"📁 Local File: {task['filename']} ({fsize_mb:.1f} MB)")
    print(f"=======================================================")

    ctx = await browser.new_context(viewport={'width': 1366, 'height': 768})
    await ctx.add_cookies(get_cookies())
    page = await ctx.new_page()

    try:
        await page.goto('https://studio.youtube.com/channel/UCiPtyUTf0Y22fJfwOE3Q44g/videos/upload?approve_browser_access=true', wait_until='domcontentloaded')
        await page.wait_for_timeout(4000)

        # 1. Click Create
        create_btn = await page.wait_for_selector('button:has-text("إنشاء"), ytcp-button#create-icon, button:has-text("Create")', timeout=15000)
        await create_btn.click()
        await page.wait_for_timeout(1000)

        # 2. Click Upload
        up_opt = await page.wait_for_selector('tp-yt-paper-item:has-text("تحميل فيديوهات"), tp-yt-paper-item:has-text("Upload videos"), #text-item-0', timeout=8000)
        await up_opt.click()
        await page.wait_for_timeout(1500)

        # 3. Attach file
        fi = await page.wait_for_selector('input[type="file"]', state='attached', timeout=12000)
        await fi.set_input_files(local_path)
        print("⏳ File attached. Waiting for dialog and video link...")

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
            raise Exception("Timeout waiting for youtu.be link to appear!")

        print(f"🔗 Video ID: {vid_id} -> https://youtu.be/{vid_id}")

        # 5. Set Title
        try:
            title_box = await page.wait_for_selector('ytcp-uploads-dialog div#textbox[aria-label*="العنوان"], ytcp-uploads-dialog div#textbox[aria-label*="Title"], ytcp-uploads-dialog div#textbox[contenteditable="true"]', timeout=8000)
            await title_box.click()
            await page.keyboard.press('Control+A')
            await page.keyboard.press('Backspace')
            await title_box.fill(task['title'][:95])
            print(f"📝 Title set: {task['title'][:95]}")
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

        # 9. Click Save
        done_btn = await page.wait_for_selector('ytcp-uploads-dialog ytcp-button#done-button, ytcp-uploads-dialog button:has-text("حفظ"), ytcp-uploads-dialog button:has-text("Save")', timeout=15000)
        await done_btn.click()
        print("💾 Clicked Save! Now waiting for full byte transfer completion...")

        # 10. Wait for byte transfer completion
        # YouTube will display: "اكتمل التحميل" or "ستبدأ عمليات التحقّق" or "جارٍ التحميل 100%" or "تمّ حفظ الفيديو"
        start_wait = time.time()
        completed = False
        last_status = ""

        while time.time() - start_wait < 600: # up to 10 minutes max
            await page.wait_for_timeout(3000)
            status_text = await page.evaluate(r'''() => {
                const textElements = Array.from(document.querySelectorAll('ytcp-uploads-dialog span, ytcp-uploads-dialog div, ytcp-video-upload-progress, ytcp-animatable'));
                const list = [];
                for (const el of textElements) {
                    const t = (el.innerText || '').trim();
                    if (t && (t.includes('تحميل') || t.includes('معالجة') || t.includes('مكتمل') || t.includes('%') || t.includes('حفظ') || t.includes('Upload') || t.includes('complete'))) {
                        list.push(t);
                    }
                }
                return list.join(' | ');
            }''')

            if status_text != last_status and status_text:
                print(f"📊 Status: {status_text[:120]}")
                last_status = status_text

            # Check for completion keywords
            if any(k in status_text for k in ['اكتمل التحميل', 'ستبدأ عمليات التحقّق', 'ستبدأ عملية المعالجة', 'تمّ حفظ الفيديو', 'Upload complete', 'Processing will begin']):
                print("🎉 Byte transfer finished successfully!")
                completed = True
                break

            # If dialog closed and main page shows status
            main_rows = await page.evaluate(r'''() => {
                const r = document.querySelector('ytcp-video-row');
                return r ? r.innerText.replace(/\n+/g, ' | ') : '';
            }''')
            if any(k in main_rows for k in ['ستبدأ عملية المعالجة', 'ستبدأ عمليات التحقّق', 'اكتمل التحميل', 'Processing']):
                print(f"🎉 YouTube Studio row shows processing: {main_rows[:100]}")
                completed = True
                break

        if not completed:
            print("⚠️ Warning: Reached timeout while waiting for completion signal, but Save was clicked.")

        # Give 5s buffer
        await page.wait_for_timeout(5000)
        return vid_id

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

        for task in CAMPS_TO_UPLOAD:
            drive_id = task['drive_id']
            with open(SESSION_DATA_PATH) as f:
                if f"videoId: '{drive_id}'" not in f.read():
                    print(f"⏩ [SKIP] {task['title']} is already updated in sessionData.tsx!")
                    continue

            try:
                vid_id = await upload_single_video(browser, task)
                if vid_id:
                    update_session_file(drive_id, vid_id)
                    print(f"✨ DONE: {task['title']} -> https://youtu.be/{vid_id}\n")
            except Exception as e:
                print(f"❌ ERROR on {task['title']}: {e}\n")

        await browser.close()
        print("\n🏁 ALL CAMP SESSIONS PROCESSED!")

if __name__ == '__main__':
    asyncio.run(main())
