---
name: lesson-video
description: Edit a recorded ICPC HUE session or lesson into a finished video: cut dead air and tech problems, split it into titled parts with blue HyperFrames cards and lower thirds, clean the voice, and output a chaptered MP4. Use for "cut this meeting recording", "edit the lesson video", "add chapters/transitions", "clean the audio".
---

# Lesson video edit

Recording in, chaptered video out. Method proven on the 2h05 C++ session (Oct 2026): 2:04:50 in, 1:34:28 out, 11 parts.

Do not render the whole video through HyperFrames: it captures frame by frame in Chrome and would take hours. HyperFrames makes only the short overlays (~2 min of rendering). ffmpeg handles the long video, the voice and the joins.

The reusable scripts and the blue design system are in [kit/](kit/). Work in a fresh folder per video, e.g. `creative_work/vids/<name>/`; never edit the original recording.

## Steps

1. **Set up.** Put the recording in `creative_work/vids/<name>/`, then:
   ```bash
   K=.claude/skills/lesson-video/kit; E=creative_work/vids/<name>/edit
   mkdir -p $E && cp $K/*.py $K/audio.sh $K/DESIGN.md $E/
   for p in cards lowers; do mkdir -p $E/$p && cp -r $K/assets $K/package.json $K/hyperframes.json $K/meta.json $K/DESIGN.md $E/$p/; done
   ```
   The generator writes `cards/index.html` and `lowers/index.html` and expects `assets/` beside each.
2. **Transcribe** (needs a GPU; the laptop MX450 is too small). Extract `ffmpeg -vn -ac 1 -ar 16000 -b:a 48k` mp3, split into 20-min chunks (`-f segment -segment_time 1200`), run on Colab with `transformers` `openai/whisper-large-v3` (faster-whisper breaks on Colab's CUDA: no `libcublas.so.12`), add SpeechBrain `spkrec-ecapa-voxceleb` + agglomerative clustering (cosine, threshold 0.5) for speaker labels. Download `transcript.txt` with a real click on the Files panel (`files.download()` from code is blocked in automated tabs, and the runtime deletes the file if it shuts down first). Delete the runtime afterwards.
3. **Find the cuts.** Read the transcript. Cut: silence 8 s+ (`ffmpeg silencedetect=noise=-35dB:d=8`), "can you hear me" audio checks, screen/mic troubleshooting, long "any questions?" waits, and post-lesson chatter. Keep one explanation of anything that is repeated. Write them to `cut-list.md` and confirm with the user before rendering.
4. **Fill `plan.py`.** `SRC`, `TRIM_START` (snap to the end of a pause: `silencedetect=noise=-32dB:d=0.35`), `END`, `CUTS` (original seconds), `PARTS` (English title, pure Arabic title, one-line sub, start second; snap starts to pauses or to a cut end). `python3 plan.py` prints the part table.
5. **Overlays.** `python3 gen_overlays.py`, then in `cards/`: `npx hyperframes lint` (0 errors; the "nested_structure" warnings are fine) and `npx hyperframes render --output ../out/cards.mp4 --fps 30`. In `lowers/`: `npx hyperframes render --format webm --output ../out/lowers.webm --fps 30` (transparent). Arabic must use the bundled Noto Kufi font (lint errors on unbundled fonts) and pure Arabic wording; Latin terms mid-phrase render in confusing order.
6. **Voice.** `./audio.sh "<recording>" audio` once for the whole track (highpass, denoise, EQ, de-ess, level, compress, two-pass loudnorm to -16 LUFS). Takes ~10 min. Compare with `showspectrumpic` before/after for the user.
7. **Review one part first.** `python3 assemble.py --only-part N`, pull frames at the card, fade-in, lower third and fade-out (`ffmpeg -ss T -frames:v 1`), look at them.
8. **Full render.** `rm -rf out/work`, then `python3 assemble.py` as a background task (~15 min). It writes `out/lesson_final.mp4` and `out/chapters.txt`. Verify: duration = lesson + 3.6 s per card + 10 s overview, and `ffmpeg -v error -i out/lesson_final.mp4 -f null -` prints nothing.
9. **Hand back.** Screenshots (overview, a card, fade, lower third on real content, voice before/after) with `SendUserFile`, plus `chapters.txt`.

## Gotchas
- `assemble.py` skips segments already in `out/work/`: delete that folder after any change to the plan, overlays or cuts.
- Never run one big `filter_complex` trim/concat over the whole recording: it dies silently at ~17 min of output. `assemble.py` cuts small pieces and joins them.
- Launch long ffmpeg jobs as tracked background tasks, not `nohup ... &`, or they get killed early.
- The lower third can cover part of the screen-share; check a frame on real content.
- Participant grids show student faces and names. Warn the user before they publish.
- The design is `kit/DESIGN.md` (navy, brand blue `#1F65A4`, sky `#5AB0FF`; logo keeps its gold, no other gold). The user's own earlier HyperFrames blue design system was not found; if they provide it, replace `DESIGN.md` and the CSS in `gen_overlays.py`.
