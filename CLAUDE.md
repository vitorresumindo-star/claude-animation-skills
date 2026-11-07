# CLAUDE.md

This repository holds Claude Code skills that make vertical (9:16) animations in code. The user is a beginner who works only from an iPhone, so do the technical work yourself in the cloud session, explain results in plain words, and send finished videos with SendUserFile.

Read `HANDOFF.md` first. It says where the work stands.

## Start of every session
```bash
bash scripts/cloud-setup.sh          # checks everything, installs what's missing (~3 min and ~1 GB the first time, seconds after that)
bash scripts/cloud-setup.sh --smoke  # optional: renders one still of the zach-d-films example to prove WebGL works
```
The script runs the repository's own `install.sh --voice`, which links the skills into `~/.claude/skills/` and installs npm packages, Playwright's Chromium, GSAP, HyperFrames, and the Kokoro voice and Parakeet word-timing models into `kit/`. Do not reinstall Playwright another way: `kit/` pins playwright 1.49.1, and `install.sh` fetches the Chromium build that version needs.

## The zach-d-films skill
- The skill is `skills/zach-d-films/SKILL.md`, and its engine and worked example are in `skills/zach-d-films/engine/`. Read SKILL.md before making a video and follow its steps: script, project, voice, captions, shots, stills, render.
- Claude Code finds the skill in two ways. `.claude/skills/zach-d-films` is a committed link to `skills/zach-d-films`, so it works as a project skill in any checkout. `install.sh` also links it into `~/.claude/skills/`. Invoke it as `/zach-d-films`, or with the Skill tool.
- Never edit `skills/zach-d-films/engine/` for a single video. Copy it into a project and change the copy.

## How we make a video here (proven settings)
- **Projects** live in `projects/<name>/`. Keep only the files that differ from the engine (`script.json`, `src/shots.js`, new prop files, patches), plus a `make.sh` that assembles the engine copy, makes the voice and renders. Copy `projects/jesus-never-born/` as the model: it renders shot by shot and adds music and sound effects (`audio.py`). `projects/l39-ejection-seat/` is the simpler, voice-only model.
- **Voice:** the free Kokoro narrator, `am_michael` at speed `1.12`, via `skills/stick-figure/engine/tools/tts_kokoro.py`. Word timings come from `kit/words.py`. Captions are 1 to 3 words, generated with `captions.py`, then trimmed by hand (numbers written as `150 km/h`, `17 g`).
- **No GPU** in the cloud, so always render with `GL=swiftshader`. Expect about 2.5 s per frame for one process, or 3–4 s per frame each with 4 processes in parallel. A 52 s video at 30 fps takes about 25–30 minutes with 4 segments.
- **Before rendering,** look at stills of every shot (`make.sh stills`) and fix framing. Re-render only the frames you change.
- **Final mux** (from SKILL.md): `scale=1080:1920:flags=lanczos`, `libx264 -crf 17`, `yuv420p`, `apad,loudnorm=I=-14:TP=-1.5`, AAC 192k, `-shortest`.
- **Verify** with `ffprobe` (1080x1920, 30 fps, frame count), a full decode (`ffmpeg -f null -`), `volumedetect`, and a contact sheet that you actually look at. Never say a render worked unless the MP4 exists and you have checked it.
- **Facts:** check claims against primary sources such as manuals and manufacturer data. Say in the hand-over which visuals are simplified.

## Pitfalls already hit (don't repeat them)
- In `cd dir && (job1) & (job2) &`, only job1 runs in `dir`. Put `cd` inside every background subshell.
- ffmpeg `trim` plus `concat` in a single filtergraph failed with a bogus "No space left on device". Trim to a file first, then use the concat demuxer.
- three.js `LatheGeometry`: points must go from bottom to top, otherwise the faces point inward and the body looks invisible.
- `git push` can return 403 ("Claude doesn't have GitHub access"). The GitHub MCP tools still worked: `mcp__github__push_files` to the same branch, then `git fetch` and `git diff` to confirm. Tell the user how to fix access (claude.ai/connect-github, and install the Claude GitHub App).
- The cloud disk is a fixed allowance. Delete `projects/*/build/`, stills and caches when they're no longer needed.
- three.js r169 `ConeGeometry` with `heightSegments > 1` loses half of its side faces (CylinderGeometry skips one triangle per quad whenever `radiusTop` is 0), which shows as see-through sawteeth. For a cone with several rows use `CylinderGeometry(0.0005, r, h, radial, rows)`.
- `group.add(mesh)` returns the group, not the mesh: never chain `.position.set` onto it.
- Canvas text overflows big fonts silently. `textTexture` in `projects/jesus-never-born/src/fx.js` measures and shrinks the font to fit; reuse it. Fonts drawn into canvases must also appear in laid-out page text so `document.fonts.ready` waits for them (see that project's `index.html`).
- Distances in a JS shortest-path search must be a `Float64Array`. A `Float32Array` rounds the stored value, the popped node then fails `d > dist[i]` and is skipped, and the search stalls without an error.
- At 9:16 the frame is only about ±11.6° wide at fov 40. Work out where side props land before rendering: a sign, a milestone and a hospital patient all fell outside the frame or behind a pillar on the first try.
- Music and effects: `projects/jesus-never-born/audio.py` synthesises a score and effects in numpy and ducks them under the voice. Check the mix by running the recogniser on it (`words.recognise(words.load('audio/mix.wav'))`) and comparing with the script, and read the voice-above-background numbers it prints.
- Never feed `pow()` a base that can go negative in a shader, and clamp fresnel terms: with 4x MSAA the edge samples extrapolate varyings, `1 - abs(dot(n, v))` dips below 0, `pow` returns NaN, and the bloom pass smears that one pixel into a white square (seen on the globe's atmosphere). Square with `x * x`, not `pow(x, 2.0)`.
- Never edit a project's `make.sh` while it is running: bash reads the script as it goes, so a rewrite in place can make it run garbage.
- Rendering shot by shot (`projects/jesus-never-born/make.sh`) lets a fix re-render only the changed shots: `ONLY=7,9 bash projects/jesus-never-born/make.sh`.

## Never commit
`kit/node_modules`, `kit/.venv`, `kit/models`, `kit/vendor`, `projects/*/build/`, audio, MP4s, stills, `.env` or any secret. `.gitignore` already covers these. Check `git status` before every commit.
