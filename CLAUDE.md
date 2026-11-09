# CLAUDE.md

Claude Code skills that render 9:16 reel animations (1080x1920) in code, with no footage needed. This repo is a fork of
`artemnovitckii/claude-animation-skills`. README, `plugin.json` and `marketplace.json` still point at upstream URLs on
purpose, so leave them unless asked.

## Layout and the one invariant
- `skills/<name>/` holds one skill each. `SKILL.md` is what Claude follows when the skill runs; it's the product, not just docs.
- Quick skills (`graph`, `minimalistic-graphics`, `map-route`, `breakdown`) are `build.py` + `template.html`.
- Engines (`stick-figure`, `zach-d-films`) are a full example reel under `engine/`, which users copy and edit.
- `kit/` holds what every skill shares: `anim.py` (fill template, HyperFrames render, snapshots, contact sheet), `words.py` (word timings), `setup.sh`, fonts.
- **Every skill finds `kit/` two levels up**: `build.py` uses `HERE.parents[1] / 'kit'`, `SKILL.md` uses
  `realpath(SKILL_DIR/../../kit)`, and `make.sh` uses `$ENGINE/../../../kit`. `install.sh` symlinks skills into
  `~/.claude/skills/`, so keep that depth and never move or copy a skill out of `skills/`.

## Setup
```bash
bash kit/setup.sh            # three.js + Playwright into kit/node_modules, GSAP into kit/vendor, warms HyperFrames
bash kit/setup.sh --voice    # also kit/.venv + ~1 GB of Kokoro/Parakeet models (needed for engine voice/captions only)
./install.sh                 # links skills into ~/.claude/skills/ and runs setup (user install, not needed to develop)
```
Needs ffmpeg/ffprobe, Node 18+ and Python 3.9+. Everything setup creates is gitignored (`kit/node_modules`, `kit/vendor`, `kit/.venv`, `kit/models`).

## Build and test
**There's no test suite, linter or CI.** Testing means rendering and looking at the output. Run builds in a scratch
folder outside the repo; they write `.work/`, `*.snaps/`, `.mp4` and `.sheet.jpg` next to the spec.

Quick skills (spec JSON in, video plus contact sheet out):
```bash
python3 skills/graph/build.py t.graph.json              # -> t.graph.mp4 + t.graph.sheet.jpg  (2D ~10 s, 3D ~1.5 min)
python3 skills/map-route/build.py r.map.json --snap 3.8 # -> r.map.snaps/frame-*.png, no video (seconds)
python3 kit/anim.py sheet <video.mp4> <out.jpg> [n]     # contact sheet, red box = Instagram safe area
python3 kit/anim.py still <video.mp4> <t> <out.jpg>
```
Minimal specs: graph `{"values":[1,2,5,9]}`, minimalistic-graphics `{}`, map-route `{"destination":"Gym","minutes":9,"distance":2.8}`, breakdown `{}`.

Engine stills (no voice setup needed):
```bash
REPO=$(git rev-parse --show-toplevel); P=<scratch>/armour
cp -R "$REPO/skills/zach-d-films/engine" "$P" && ln -s "$REPO/kit/node_modules" "$P/node_modules"
(cd "$P" && node render.mjs stills 6.8 stills)          # 720x1280 PNG; GL=swiftshader if there's no GPU
P=<scratch>/pirate; cp -r "$REPO/skills/stick-figure/engine/template" "$P"
(cd "$P" && NODE_PATH="$REPO/kit/node_modules" node "$REPO/skills/stick-figure/engine/tools/render.js" stills 4.2)
```
Full engine reels (`bash skills/stick-figure/engine/make.sh <reel>`, `node render.mjs video ...` + the ffmpeg mux in
`zach-d-films/SKILL.md`) need `setup.sh --voice` first.

**Before calling a change done:** render what you touched, open the sheet or stills, and check that text fits on its
line, nothing important sits outside the safe area (x 100–980, y 220–1500) or in the caption band, and the last frame
shows the payoff. For a `SKILL.md` change, do a cold-start run: follow the SKILL.md steps from a fresh folder the way a
new user would (that's how the last round of fixes was found).

## Contracts to keep
- **Quick templates:** `const SPEC = __SPEC__;` and `__DURATION__` are text-replaced by `anim.prepare`. The root div
  carries `data-composition-id="main"` and data duration/fps/size. Build one paused GSAP timeline, pad it with
  `tl.set({}, {}, __DURATION__)` and register it as `window.__timelines["main"]`. Assets load from the render folder:
  `fonts/*.woff2`, `vendor/gsap.min.js`, and for 3D `vendor/three/three.module.js` + `vendor/three/addons/` via an import map.
- **build.py:** `DEFAULTS` lists every spec field (unknown fields get a "note: ignoring" line). `check(spec)` calls
  `sys.exit('spec: ...')` for bad input and `print('note: ...')` for soft warnings. `out`, `hold` and `template` are
  reserved spec fields handled by `anim.build`. If `build.py` computes the duration (minimalistic-graphics `payoff`),
  the template must use the same formula.
- **Engines are pure functions of time.** zach-d-films: `window.renderAt(t)`, and each shot's `update(t)` may depend
  only on `t`, because renders start mid-shot. stick-figure: `renderFrame(f)` / `window.TOTAL_FRAMES`, at 30 fps.
  Never carry state between frames, and never use unseeded `Math.random`.
- **Pinned versions move together:** HyperFrames `0.8.34` (`kit/anim.py` and `kit/setup.sh`), GSAP `3.12.5`
  (`setup.sh`), three `0.169.0` + Playwright `1.49.1` (`kit/package.json` + lockfile).
- Output is always 1080x1920 at 30 fps. Safe-area numbers live in `kit/anim.py` (`SAFE_TOP/BOTTOM/SIDE`).

## Code style
- **Python:** in `kit/anim.py` and every `build.py`, standard library only, plus ffmpeg and npx on PATH. numpy,
  sherpa-onnx and kokoro are only for tools run with `kit/.venv/bin/python`. Stay 3.9-compatible (no `match`, no
  `X | Y` types). 4 spaces, single quotes, lines up to ~120 characters, a short module docstring showing usage, and
  `subprocess` with `check=True`.
- **JS:** 2 spaces, single quotes, semicolons, terse helpers. zach-d-films and the quick templates use ES modules (`import * as THREE from 'three'`).
  stick-figure `web/*.js` files are plain scripts sharing globals, loaded in order by `web/index.html` (add new files there).
  The engine renderers are Node scripts driving Playwright.
- **Shell:** `#!/usr/bin/env bash`, `set -euo pipefail`, resolve paths from `${BASH_SOURCE[0]}`, and a usage comment at the top.
- No new dependencies or CDN loads at render time. Everything is vendored into the render folder.

## Writing style (SKILL.md, README, comments, on-screen text)
- Plain and short. British spelling (colour, armour, labelled). **No em dashes**, so use colons, commas or full stops.
- SKILL.md shape: frontmatter `name` + a `description` ending "Use when the user runs /<name> or asks for ...", an
  ASCII mock of the frame, `## First use` (the `SKILL_DIR` / `KIT` preamble), numbered `## Steps` with a bold lead
  word, `## Spec`, `## Taste` or `## Style`.
- On-screen text has no marketing words, callouts or emojis, and data is never invented (see each skill's Taste section).

## Adding a quick skill
Copy `skills/graph`, then edit `template.html` (read `SPEC`) and `DEFAULTS`/`check` in `build.py`, and write the SKILL.md. Then update
the README table and "How it's built", plus the skill count and list in `.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json` and the README ("Six skills").

## Git
Commit messages: a one-line summary, then a body of `- ` bullets saying what changed and why. Don't commit renders, `.work/`,
`*.snaps/`, `stills/`, `seg/`, `silent.mp4` or anything setup downloads.

## Reference code: megaclawd
`seeconever/megaclawd` (public, read-only here) is a separate project: an 82 s anime short rendered in three.js with
the same "frame = pure function of time" rule. It's useful as a pattern source for engine work, not as code to vendor.
It has resumable parallel chunked rendering (`tools/render.mjs`), a frame QC pass for collisions, luma jumps and frozen
or blank frames (`tools/check.mjs`), and URL-param scrubbing (`?t=`, `?shot=`). Clone it outside this repo with
`git clone --depth 1 https://github.com/seeconever/megaclawd ../megaclawd`.
