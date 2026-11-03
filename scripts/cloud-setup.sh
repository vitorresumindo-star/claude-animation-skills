#!/usr/bin/env bash
# Checks for everything the animation skills need and installs what is missing, using the steps
# that worked in a Claude Code cloud session (Linux, no GPU). Safe to run again: finished steps are skipped.
#
#   bash scripts/cloud-setup.sh            # check, install anything missing (incl. the ~1 GB voice models), re-check
#   bash scripts/cloud-setup.sh --check    # only report, change nothing
#   bash scripts/cloud-setup.sh --smoke    # also render one still of the zach-d-films example to prove WebGL works
#
# Downloads it may need (all worked through the cloud proxy with the default network policy):
#   registry.npmjs.org (three, playwright, fonts, hyperframes), playwright's browser CDN (Chromium for playwright 1.49.1),
#   cdnjs.cloudflare.com (GSAP), pypi.org + files.pythonhosted.org (kokoro-onnx, sherpa-onnx ...),
#   github.com release downloads (Kokoro voice + Parakeet word-timing models).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIT="$ROOT/kit"
MODE="${1:-}"
missing=()
ok()   { printf '  \033[32mok\033[0m   %s\n' "$*"; }
miss() { printf '  \033[31mmiss\033[0m %s\n' "$*"; missing+=("$1"); }

check_all() {
  missing=()
  echo "Checking animation-skill dependencies in $ROOT"
  command -v ffmpeg >/dev/null && ok "ffmpeg ($(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3))" || miss ffmpeg
  if command -v node >/dev/null && node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)'; then ok "node $(node -v)"; else miss node; fi
  if command -v python3 >/dev/null && python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)'; then ok "python $(python3 -V | cut -d' ' -f2)"; else miss python3; fi
  for p in three playwright @fontsource/montserrat; do [ -d "$KIT/node_modules/$p" ] && ok "kit/node_modules/$p" || miss "npm:$p"; done
  local chrome=""
  [ -d "$KIT/node_modules/playwright" ] && chrome=$(cd "$KIT" && node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null)
  [ -n "$chrome" ] && [ -x "$chrome" ] && ok "Chromium for playwright ($chrome)" || miss "chromium"
  [ -s "$KIT/vendor/gsap.min.js" ] && ok "kit/vendor/gsap.min.js" || miss gsap
  if [ -x "$KIT/.venv/bin/python" ] && "$KIT/.venv/bin/python" -c 'import kokoro_onnx, sherpa_onnx, soundfile, scipy, espeakng_loader' 2>/dev/null; then ok "kit/.venv voice libraries"; else miss venv; fi
  for f in kokoro-v1.0.onnx voices-v1.0.bin; do [ -s "$KIT/models/$f" ] && ok "kit/models/$f" || miss "model:$f"; done
  ls -d "$KIT"/models/sherpa-onnx-nemo-parakeet* >/dev/null 2>&1 && ok "kit/models/sherpa-onnx-nemo-parakeet (word timings)" || miss "model:parakeet"
  [ -e "$HOME/.claude/skills/zach-d-films/SKILL.md" ] && ok "~/.claude/skills/zach-d-films linked" || miss "skill-link"
  [ -e "$ROOT/.claude/skills/zach-d-films/SKILL.md" ] && ok ".claude/skills/zach-d-films (project skill)" || miss "project-skill"
}

check_all
if [ "$MODE" = "--check" ]; then
  [ ${#missing[@]} -eq 0 ] && echo "All present." || echo "Missing: ${missing[*]}"
  exit $([ ${#missing[@]} -eq 0 ] && echo 0 || echo 1)
fi

if [ ${#missing[@]} -gt 0 ]; then
  echo "Installing: ${missing[*]}"
  if [[ " ${missing[*]} " == *" ffmpeg "* ]]; then
    if command -v apt-get >/dev/null; then (apt-get update -qq && apt-get install -y -qq ffmpeg) || echo "could not apt-get install ffmpeg"; else echo "install ffmpeg yourself"; fi
  fi
  for t in node python3; do [[ " ${missing[*]} " == *" $t "* ]] && { echo "$t is missing and must come from the environment image; stopping."; exit 1; }; done
  # the repository's own installer: links skills into ~/.claude/skills, npm deps + Chromium + GSAP + HyperFrames, voice venv + models
  bash "$ROOT/install.sh" --voice || { echo "install.sh --voice failed (see above). If a download was blocked, note the domain."; exit 1; }
  # project-level skill link (committed in git; recreate if a checkout lost it)
  if [ ! -e "$ROOT/.claude/skills/zach-d-films/SKILL.md" ]; then mkdir -p "$ROOT/.claude/skills"; ln -sfn ../../skills/zach-d-films "$ROOT/.claude/skills/zach-d-films"; fi
  echo; check_all
fi

if [ "$MODE" = "--smoke" ]; then
  echo "Smoke test: one still of the zach-d-films example with software WebGL"
  T=$(mktemp -d); cp -R "$ROOT/skills/zach-d-films/engine/." "$T/"; ln -s "$KIT/node_modules" "$T/node_modules"
  (cd "$T" && GL=swiftshader node render.mjs stills 5.5 stills) && [ -s "$T/stills/t_5.50.png" ] && ok "rendered $(du -h "$T/stills/t_5.50.png" | cut -f1) still" || miss smoke
  rm -rf "$T"
fi

if [ ${#missing[@]} -eq 0 ]; then echo "Ready."; else echo "Still missing: ${missing[*]}"; exit 1; fi
