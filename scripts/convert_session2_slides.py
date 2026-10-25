#!/usr/bin/env python3
"""Convert Session 2 slides (PPTX or PDF) into webp images for SlideViewer.

Usage:
    python3 scripts/convert_session2_slides.py [path_to_pptx_or_pdf]
"""

import sys
import shutil
import subprocess
from pathlib import Path

DEFAULT_PPTX = Path("/home/yousefmsm1/Desktop/ICPC HUE - Canva Template Kit/ICPC HUE - Session 02.pptx")
DEST_DIR = Path(__file__).resolve().parent.parent / "next-app" / "public" / "sessions" / "2027" / "level0" / "session-02"
CONTENT_FILE = Path(__file__).resolve().parent.parent / "next-app" / "lib" / "content" / "sessions" / "season2027" / "Level0Session2Content.tsx"

def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PPTX
    if not src.exists():
        print(f"Error: Source file does not exist: {src}")
        sys.exit(1)

    work_dir = Path("/tmp/session02_slides_work")
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

    pdf_path = src
    if src.suffix.lower() in [".pptx", ".ppt"]:
        print(f"Converting PPTX to PDF via LibreOffice...")
        cmd = ["libreoffice", "--headless", "--convert-to", "pdf", str(src), "--outdir", str(work_dir)]
        subprocess.run(cmd, check=True)
        converted_pdf = work_dir / f"{src.stem}.pdf"
        if not converted_pdf.exists():
            candidates = list(work_dir.glob("*.pdf"))
            if candidates:
                pdf_path = candidates[0]
            else:
                print("Failed to find converted PDF.")
                sys.exit(1)
        else:
            pdf_path = converted_pdf

    print(f"Rendering slides from {pdf_path} to WebP...")
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    for existing in DEST_DIR.glob("slide-*.webp"):
        existing.unlink()

    render_prefix = work_dir / "slide"
    cmd = ["pdftoppm", "-webp", "-r", "150", str(pdf_path), str(render_prefix)]
    subprocess.run(cmd, check=True)

    rendered_files = sorted(work_dir.glob("slide-*.webp"))
    slide_count = len(rendered_files)
    print(f"Generated {slide_count} slides.")

    for i, f in enumerate(rendered_files, 1):
        target = DEST_DIR / f"slide-{i:02d}.webp"
        shutil.move(f, target)

    print(f"Saved slides to {DEST_DIR}")

    if CONTENT_FILE.exists():
        content = CONTENT_FILE.read_text(encoding="utf-8")
        import re
        new_content = re.sub(r"const SLIDE_COUNT = \d+;", f"const SLIDE_COUNT = {slide_count};", content)
        CONTENT_FILE.write_text(new_content, encoding="utf-8")
        print(f"Updated SLIDE_COUNT = {slide_count} in {CONTENT_FILE}")

    shutil.rmtree(work_dir, ignore_errors=True)
    print("Done!")

if __name__ == "__main__":
    main()
