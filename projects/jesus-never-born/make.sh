#!/usr/bin/env bash
# Rebuilds "What would happen if Jesus were never born?" from source with the settings that worked.
# Run scripts/cloud-setup.sh first. Output goes to projects/jesus-never-born/build/ (git-ignored).
#
#   bash projects/jesus-never-born/make.sh                     # everything: assemble, voice, timings, render, sound, mux, verify (~40 min)
#   bash projects/jesus-never-born/make.sh stills 1.2,19.4,41  # assemble + stills only (look before a full render)
#   bash projects/jesus-never-born/make.sh audio               # remake only the music + effects mix and the final mux
#   TO=2 bash projects/jesus-never-born/make.sh                # quick test: only the first 2 seconds
#   ONLY=7,9 bash projects/jesus-never-born/make.sh            # re-render only shots 7 and 9 (0-based), keep the rest
#
# Settings: VOICE=am_michael SPEED=1.12 (Kokoro), JOBS=4 parallel render segments, GL=swiftshader (no GPU in the cloud).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
KIT="$ROOT/kit"; PY="$KIT/.venv/bin/python"
B="$HERE/build"
VOICE="${VOICE:-am_michael}"; SPEED="${SPEED:-1.12}"; JOBS="${JOBS:-4}"; FPS=30
export GL="${GL:-swiftshader}"
NAME=jesus-never-born

# 1. assemble: the engine, then this project's files over it
mkdir -p "$B/fonts"
cp -R "$ROOT/skills/zach-d-films/engine/." "$B/"
cp "$HERE/script.json" "$HERE/index.html" "$HERE/audio.py" "$B/"; cp "$HERE"/src/*.js "$B/src/"; cp "$HERE"/fonts/*.woff2 "$B/fonts/"
ln -sfn "$KIT/node_modules" "$B/node_modules"
echo "assembled $B"

if [ "${1:-}" = "stills" ]; then
  (cd "$B" && rm -rf stills && node render.mjs stills "${2:-1}" stills)
  echo "stills in $B/stills"; exit 0
fi

# 2. voice (kept between runs; FORCE_VOICE=1 to remake) + word timings
if [ ! -s "$B/audio/vo.wav" ] || [ -n "${FORCE_VOICE:-}" ]; then
  (cd "$B" && "$PY" "$ROOT/skills/stick-figure/engine/tools/tts_kokoro.py" "$VOICE" "$SPEED" && cp audio/vo_kokoro.wav audio/vo.wav)
fi
(cd "$B" && "$PY" "$KIT/words.py" audio/vo.wav script.json >/dev/null && python3 captions.py audio/vo.words.json > audio/captions.suggested.txt)
echo "word timings: $B/audio/vo.words.json (CAPTIONS in src/shots.js were hand-trimmed from audio/captions.suggested.txt)"

# 3. music + sound effects, made in code and mixed under the voice -> audio/mix.wav
(cd "$B" && "$PY" audio.py)

if [ "${1:-}" != "audio" ]; then
  # 4. render shot by shot (each shot its own frame-exact clip) in JOBS parallel workers, balanced by frame count.
  #    ONLY=3,7 re-renders just those shots and keeps the other clips. cd inside every background subshell!
  mkdir -p "$B/seg"
  python3 - "$HERE/src/shots.js" "$FPS" "${TO:-1e9}" "$JOBS" "${ONLY:-}" > "$B/seg/plan.txt" <<'PY'
import re, sys, math
s = open(sys.argv[1]).read(); fps = int(sys.argv[2]); end = float(sys.argv[3]); jobs = int(sys.argv[4])
only = {int(x) for x in sys.argv[5].split(',') if x.strip()} if sys.argv[5] else None
dur = float(re.search(r'export const DURATION = ([0-9.]+)', s).group(1))
shots = re.findall(r'\{ start: ([0-9.]+), end: ([^,]+), build', s)
N = math.floor(min(end, dur) * fps + 1e-6)
items = []
for i, (a, b) in enumerate(shots):
    a = float(a); b = dur if 'DURATION' in b else float(b)
    n0 = math.ceil(a * fps - 1e-6); n1 = min(N, math.ceil(b * fps - 1e-6))
    if n1 > n0: items.append((i, n0, n1))
load = [0] * jobs; plan = [[] for _ in range(jobs)]
for it in sorted(items, key=lambda x: x[1] - x[2]):
    w = load.index(min(load)); load[w] += it[2] - it[1]; plan[w].append(it)
for w in range(jobs):
    for i, n0, n1 in plan[w]:
        print(w, i, n0, n1, 'render' if only is None or i in only else 'keep')
print('ALL', ' '.join(str(i) for i, _, _ in items))
PY
  for ((w = 0; w < JOBS; w++)); do
    (cd "$B" && while read -r ww i n0 n1 mode; do
       [ "$ww" = "$w" ] && [ "$mode" = "render" ] || continue
       f=$(printf "seg/shot_%02d.mp4" "$i")
       node render.mjs video "$f" $FPS "$(python3 -c "print($n0/$FPS)")" "$(python3 -c "print(($n1+0.5)/$FPS)")" < /dev/null > "${f%.mp4}.log" 2>&1 && echo "exit=0" >> "${f%.mp4}.log" || echo "exit=1" >> "${f%.mp4}.log"
     done < seg/plan.txt) &
  done
  echo "rendering $(grep -c ' render$' "$B/seg/plan.txt") shots in $JOBS workers (about 3-5 s per frame per worker)..."
  wait
  ALL=$(grep '^ALL' "$B/seg/plan.txt" | cut -d' ' -f2-)
  for i in $ALL; do f=$(printf "%s/seg/shot_%02d" "$B" "$i"); [ -s "$f.mp4" ] && grep -q "exit=0" "$f.log" || { echo "shot $i failed:"; tail -5 "$f.log" 2>/dev/null; exit 1; }; done
  # join with the concat demuxer (stream copy). Do NOT use trim+concat in one filtergraph: it fails with a bogus ENOSPC.
  (cd "$B" && for i in $ALL; do printf "file 'seg/shot_%02d.mp4'\n" "$i"; done > segs.txt && ffmpeg -v error -y -f concat -safe 0 -i segs.txt -c copy silent.mp4)
fi

# 5. mux: picture + mix, scale to 1080x1920, level to -14 LUFS
(cd "$B" && ffmpeg -v error -y -i silent.mp4 -i audio/mix.wav -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p \
   -af "apad,loudnorm=I=-14:TP=-1.5" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$NAME.mp4")

# 6. verify: streams, full decode, loudness, contact sheet
cd "$B"
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames,r_frame_rate -show_entries format=duration,size -of compact "$NAME.mp4"
ffmpeg -v error -i "$NAME.mp4" -f null - && echo "decodes cleanly"
ffmpeg -i "$NAME.mp4" -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume"
ffmpeg -v error -y -i "$NAME.mp4" -vf "fps=1/3,scale=200:356,tile=10x2" -frames:v 1 sheet.jpg
echo "done: $B/$NAME.mp4 (contact sheet: $B/sheet.jpg)"
