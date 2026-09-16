import os, subprocess

TEMP_DIR = '/home/yousefmsm1/Desktop/icpchue_videos'
os.makedirs(TEMP_DIR, exist_ok=True)

CAMP_SESSIONS = [
    {"slug": "data-types", "drive_id": "1Ihh7e6pxPbu5L8RobscDgfSVv-WJEE6g", "filename": "temp_1_data-types.mp4"},
    # 2 is already uploaded (M4BGbmasoJg)
    {"slug": "control-flow", "drive_id": "1rm9v66HZd-_bZ7Z9KrpPbIIubBaqIa14", "filename": "temp_3_control-flow.mp4"},
    {"slug": "functions", "drive_id": "12sTF5jj5S-w763CNt_k5XNpuAjYJC9Fk", "filename": "temp_4_functions.mp4"},
    {"slug": "recursion", "drive_id": "1bWcPjD6DEsCRKQ14Gk_M-1EHjvrKkD4C", "filename": "temp_5_recursion.mp4"},
    {"slug": "arrays-and-adhocs", "drive_id": "1lSj_AO1AijyMLAwayNFWbVTX81lfWHyY", "filename": "temp_6_arrays.mp4"},
    {"slug": "complexity", "drive_id": "1nNM7Zd4DoZZB5js5Se3tzU9q0UPzneHb", "filename": "temp_7_complexity.mp4"},
    {"slug": "contest-3", "drive_id": "1NpXBt2jPxwE6696h9UKnsdV5qtZKy5R4", "filename": "temp_8_contest3.mp4"},
    {"slug": "pro1-revision", "drive_id": "1wa6DS3f-PMTaGEmdnvuU7q-ILkE703ak", "filename": "temp_pro1_1_revision.mp4"},
    {"slug": "pro1-exam", "drive_id": "1n3aiK4zG29WK6Si3NoJnnZKN-QvymCjR", "filename": "temp_pro1_2_exam.mp4"},
    {"slug": "level1-time", "drive_id": "1fH4AIGqw3j6XSomagPB3CNwJVtM1YUxf", "filename": "temp_level1_1_time.mp4"},
    {"slug": "level1-stl1", "drive_id": "1_oitAo2oKbimJ_eWBhX5WXHNOJY4CJN6", "filename": "temp_level1_2_stl1.mp4"},
]

def download(drive_id, dest_file):
    print(f"\n[DOWNLOAD] Drive ID: {drive_id} -> {dest_file}")
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[SKIP] Already exists ({os.path.getsize(dest_file)} bytes)")
        return True
    
    # 1. Try gdown
    cmd = ["/home/yousefmsm1/.local/bin/gdown", f"https://drive.google.com/uc?id={drive_id}", "-O", dest_file]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[SUCCESS gdown] ({os.path.getsize(dest_file)} bytes)")
        return True

    # 2. Try yt-dlp fallback
    print("[FALLBACK] Using yt-dlp...")
    ytdlp_cmd = [
        "/home/yousefmsm1/.local/bin/yt-dlp",
        "--no-update",
        "-f", "bestvideo+bestaudio/best",
        "-o", dest_file,
        f"https://drive.google.com/file/d/{drive_id}/view"
    ]
    subprocess.run(ytdlp_cmd, capture_output=True, text=True)
    if os.path.exists(dest_file) and os.path.getsize(dest_file) > 10 * 1024 * 1024:
        print(f"[SUCCESS yt-dlp] ({os.path.getsize(dest_file)} bytes)")
        return True

    print(f"[FAILED] Could not download {drive_id}")
    return False

for item in CAMP_SESSIONS:
    dest = os.path.join(TEMP_DIR, item['filename'])
    download(item['drive_id'], dest)

print("\n🎉 ALL CAMP SESSIONS DOWNLOADED LOCALLY!")
