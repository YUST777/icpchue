"""Assemble the final edited lesson.

Inputs (made earlier):  ../<SRC mp4>, audio/clean.wav (cleaned speech), out/cards.mp4 (HyperFrames cards),
                        out/lowers.webm (HyperFrames lower thirds, alpha).
Output: out/lesson_final.mp4 and out/chapters.txt

    python3 assemble.py [--only-part N]   # --only-part renders just that part (for review)
"""
import subprocess
import sys
from pathlib import Path

import plan

FPS = 30
HERE = Path(__file__).parent
SRC = HERE.parent / plan.SRC
CLEAN = HERE / "audio" / "clean.wav"
CARDS = HERE / "out" / "cards.mp4"
LOWERS = HERE / "out" / "lowers.webm"
WORK = HERE / "out" / "work"
BLUE = "0x1F65A4"
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-g", "60", "-keyint_min", "30", "-sc_threshold", "0", "-an"]


def run(cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def frames(sec):
    return int(round(sec * FPS))


def part_pieces(i):
    """Pieces (orig_start, n_frames) that belong to part i."""
    s = plan.PARTS[i]["start"]
    e = plan.PARTS[i + 1]["start"] if i + 1 < len(plan.PARTS) else plan.END
    out = []
    for a, b in plan.keep_pieces():
        lo, hi = max(a, s), min(b, e)
        if hi - lo > 0.05:
            out.append((lo, frames(hi - lo)))
    return out


def build_segments(only=None):
    """Ordered list of dicts: kind card|vid, with video+audio info."""
    segs = []
    n_head, n_tail = frames(plan.HEAD_SECONDS), frames(0.5)
    if only is None:
        segs.append(dict(kind="card", src_t=0.0, n=frames(plan.AGENDA_SECONDS), tag="agenda"))
    for i in range(len(plan.PARTS)):
        if only is not None and i != only:
            continue
        segs.append(dict(kind="card", src_t=plan.AGENDA_SECONDS + i * plan.CARD_SECONDS, n=frames(plan.CARD_SECONDS), tag=f"card{i}", part=i))
        pieces = part_pieces(i)
        total = sum(n for _, n in pieces)
        elapsed = 0
        for a, n in pieces:
            cuts = sorted({c - elapsed for c in (n_head, total - n_tail) if 0 < c - elapsed < n})
            bounds = [0] + cuts + [n]
            for x, y in zip(bounds, bounds[1:]):
                g0, g1 = elapsed + x, elapsed + y          # position inside the part, in frames
                segs.append(dict(
                    kind="vid", src_t=a + x / FPS, n=y - x, tag=f"p{i}_{g0}", part=i, g0=g0,
                    fade_in=(g0 == 0), fade_out=(g1 == total),
                    overlay=(g0 < n_head), part_frames=total,
                ))
            elapsed += n
    return segs


def encode_segments(segs):
    WORK.mkdir(parents=True, exist_ok=True)
    listing = []
    for k, s in enumerate(segs):
        out = WORK / f"{k:03d}_{s['tag']}.mp4"
        listing.append(out)
        if out.exists():
            continue
        if s["kind"] == "card":
            run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-ss", f"{s['src_t']:.4f}", "-i", CARDS,
                 "-frames:v", s["n"], "-vf", f"fps={FPS},format=yuv420p", *ENC, out])
            continue
        vf = f"fps={FPS},scale=1920:1080:flags=lanczos,format=yuv420p"
        fades = ""
        if s["fade_in"]:
            fades += f",fade=t=in:st=0:d=0.4:color={BLUE}"
        if s["fade_out"]:
            fades += f",fade=t=out:st={(s['n'] - frames(0.5)) / FPS:.4f}:d=0.5:color={BLUE}"
        if s["overlay"]:
            lo_t = s["part"] * plan.HEAD_SECONDS + s["g0"] / FPS
            run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-ss", f"{s['src_t']:.4f}", "-i", SRC,
                 "-c:v", "libvpx-vp9", "-ss", f"{lo_t:.4f}", "-i", LOWERS,
                 "-filter_complex", f"[0:v]{vf}[b];[1:v]fps={FPS},format=rgba[o];[b][o]overlay=0:0:format=auto:shortest=1{fades}[v]",
                 "-map", "[v]", "-frames:v", s["n"], *ENC, out])
        else:
            run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-ss", f"{s['src_t']:.4f}", "-i", SRC,
                 "-vf", vf + fades, "-frames:v", s["n"], *ENC, out])
        print("encoded", out.name, flush=True)
    return listing


def build_audio(segs, out_wav):
    """One filter graph over clean.wav: speech pieces, silence + whoosh for cards, edge fades."""
    parts, inputs = [], ["-i", CLEAN, "-f", "lavfi", "-i", "anoisesrc=d=0.7:c=pink:a=0.6:r=48000"]
    chain = []
    for k, s in enumerate(segs):
        d = s["n"] / FPS
        if s["kind"] == "card":
            chain.append(
                f"anullsrc=r=48000:cl=mono,atrim=0:{d:.5f}[sil{k}];"
                f"[1:a]asplit=2[w1_{k}][w2_{k}];"
                f"[w1_{k}]lowpass=f=2400,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.35,volume=0.22,adelay=100[wa{k}];"
                f"[w2_{k}]lowpass=f=1800,afade=t=in:d=0.2,afade=t=out:st=0.2:d=0.3,volume=0.18,adelay={int((d - 0.55) * 1000)}[wb{k}];"
                f"[sil{k}][wa{k}][wb{k}]amix=inputs=3:duration=first:normalize=0,atrim=0:{d:.5f},asetpts=N/SR/TB[a{k}]"
            )
        else:
            f = ""
            if s["fade_in"]:
                f += ",afade=t=in:st=0:d=0.4"
            if s["fade_out"]:
                f += f",afade=t=out:st={d - 0.5:.5f}:d=0.5"
            chain.append(f"[0:a]atrim=start={s['src_t']:.5f}:duration={d:.5f},asetpts=N/SR/TB{f}[a{k}]")
    labels = "".join(f"[a{k}]" for k in range(len(segs)))
    graph = ";".join(chain) + f";{labels}concat=n={len(segs)}:v=0:a=1[aout]"
    (WORK / "audio_graph.txt").write_text(graph)
    run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", *inputs, "-filter_complex_script", WORK / "audio_graph.txt",
         "-map", "[aout]", "-ac", "1", "-c:a", "pcm_s16le", out_wav])


def chapters(segs):
    t, rows = 0.0, []
    for s in segs:
        if s["kind"] == "card":
            if s["tag"] == "agenda":
                rows.append((t, "Overview"))
            else:
                rows.append((t, plan.PARTS[s["part"]]["en"]))
        t += s["n"] / FPS
    return rows


def main():
    only = None
    if "--only-part" in sys.argv:
        only = int(sys.argv[sys.argv.index("--only-part") + 1]) - 1
    segs = build_segments(only)
    listing = encode_segments(segs)
    tag = f"part{only + 1}" if only is not None else "final"
    out_wav = WORK / f"audio_{tag}.wav"
    build_audio(segs, out_wav)
    vlist = WORK / f"video_{tag}.txt"
    vlist.write_text("".join(f"file '{p}'\n" for p in listing))
    out = HERE / "out" / (f"review_{tag}.mp4" if only is not None else "lesson_final.mp4")
    run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", vlist, "-i", out_wav,
         "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", out])
    if only is None:
        def stamp(t):
            t = int(t)
            return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60:02d}:{t % 60:02d}"
        lines = [f"{stamp(t)} {name}" for t, name in chapters(segs)]
        (HERE / "out" / "chapters.txt").write_text("\n".join(lines) + "\n")
    print("DONE", out)


if __name__ == "__main__":
    main()
