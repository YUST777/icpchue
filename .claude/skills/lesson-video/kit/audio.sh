#!/bin/bash
# Clean the speech track of the whole recording once, then loudness-normalise it (two-pass, linear).
# usage: audio.sh <source.mp4> <out dir>
set -e
SRC="$1"; OUT="${2:-audio}"; mkdir -p "$OUT"
CHAIN="highpass=f=80,lowpass=f=7800,afftdn=nr=12:nf=-38:tn=1,equalizer=f=220:t=q:w=1:g=-2.5,equalizer=f=3200:t=q:w=1.2:g=2.5,deesser=i=0.25,dynaudnorm=f=300:g=11:p=0.92:m=10,acompressor=threshold=-20dB:ratio=3:attack=12:release=220:makeup=2"
ffmpeg -nostdin -y -loglevel error -i "$SRC" -vn -ac 1 -ar 48000 -af "$CHAIN" "$OUT/clean_raw.wav"
ffmpeg -nostdin -y -i "$OUT/clean_raw.wav" -af loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json -f null - 2> "$OUT/ln.txt"
python3 - "$OUT" <<'EOF'
import json, re, sys
t = open(sys.argv[1] + "/ln.txt").read()
j = json.loads(re.search(r"\{.*\}", t, re.S).group(0))
open(sys.argv[1] + "/ln.args", "w").write(
    f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
    f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
EOF
ffmpeg -nostdin -y -loglevel error -i "$OUT/clean_raw.wav" -af "$(cat $OUT/ln.args)" -ar 48000 "$OUT/clean.wav"
echo AUDIO_DONE
