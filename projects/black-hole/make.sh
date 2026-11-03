#!/usr/bin/env bash
# Rebuilds the "What would you see falling into a black hole?" video from source with the exact settings that worked.
# Run scripts/cloud-setup.sh first. Output goes to projects/black-hole/build/ (git-ignored).
#
#   bash projects/black-hole/make.sh                 # everything: assemble, voice, timings, render, mux, verify (~30 min)
#   bash projects/black-hole/make.sh stills 2,5.5,16,28,37     # assemble + stills only (look before a full render)
#   TO=2 bash projects/black-hole/make.sh            # quick test: only the first 2 seconds
#
# Settings: VOICE=am_michael SPEED=1.12 (Kokoro), JOBS=4 parallel render segments, GL=swiftshader (no GPU in the cloud).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
KIT="$ROOT/kit"; PY="$KIT/.venv/bin/python"
B="$HERE/build"
VOICE="${VOICE:-am_michael}"; SPEED="${SPEED:-1.12}"; JOBS="${JOBS:-4}"; FPS=30
export GL="${GL:-swiftshader}"
NAME=black-hole

mkdir -p "$B"
cp -R "$ROOT/skills/zach-d-films/engine/." "$B/"
cp "$HERE/script.json" "$B/"; cp "$HERE"/src/*.js "$B/src/"
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

# 3. render in parallel frame-exact segments, each in its own process (cd inside every subshell!)
DUR=$(grep -oP 'export const DURATION = \K[0-9.]+' "$HERE/src/shots.js")
END="${TO:-$DUR}"
N=$(python3 -c "import math;print(math.floor(min($END,$DUR)*$FPS + 1e-6))")
rm -f "$B"/seg*.mp4 "$B"/seg*.log
for ((i = 0; i < JOBS; i++)); do
  a=$((N * i / JOBS)); b=$((N * (i + 1) / JOBS))
  from=$(python3 -c "print(f'{$a/$FPS:.6f}')"); to=$(python3 -c "print(f'{($b+0.5)/$FPS:.6f}')")
  (cd "$B" && node render.mjs video "seg$i.mp4" $FPS "$from" "$to" > "seg$i.log" 2>&1; echo "exit=$?" >> "seg$i.log") &
done
echo "rendering $N frames in $JOBS segments (about 3-4 s per frame per segment)..."
wait
for ((i = 0; i < JOBS; i++)); do grep -q "exit=0" "$B/seg$i.log" || { echo "segment $i failed:"; tail -5 "$B/seg$i.log"; exit 1; }; done

# 4. join (concat demuxer, stream copy - do NOT use trim+concat in one filtergraph, it fails with a bogus ENOSPC), add voice, scale, level
(cd "$B" && for ((i = 0; i < JOBS; i++)); do echo "file 'seg$i.mp4'"; done > segs.txt \
  && ffmpeg -v error -y -f concat -safe 0 -i segs.txt -c copy silent.mp4 \
  && ffmpeg -v error -y -i silent.mp4 -i audio/vo.wav -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p \
       -af "apad,loudnorm=I=-14:TP=-1.5" -c:a aac -b:a 192k -shortest "$NAME.mp4")

# 5. verify: streams, full decode, loudness, contact sheet
cd "$B"
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of compact "$NAME.mp4"
ffmpeg -v error -i "$NAME.mp4" -f null - && echo "decodes cleanly"
ffmpeg -i "$NAME.mp4" -af volumedetect -vn -f null - 2>&1 | grep -E "mean_volume|max_volume"
ffmpeg -v error -y -i "$NAME.mp4" -vf "fps=1/3,scale=200:356,tile=9x2" -frames:v 1 sheet.jpg
echo "done: $B/$NAME.mp4 (contact sheet: $B/sheet.jpg)"
