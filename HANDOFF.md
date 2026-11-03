# Handoff: where we are

_Last updated 2026-11-03, branch `claude/zach-d-films-test-render-yjax2g`._

## Done
1. **Setup proven in the cloud.** `install.sh --voice` worked with the default network policy, with no blocked downloads. ffmpeg 6.1, Node 22, Python 3.13, 4 CPUs, no GPU. `scripts/cloud-setup.sh` now repeats those steps and skips what's already done.
2. **Test render.** An 8 s clip of the zach-d-films armour example with Kokoro narration rendered and checked (frames, audio, decode).
3. **First complete video: "How does the L-39's ejection seat work?"** 51.9 s, 1080x1920, 30 fps, narration and synced captions, 11 shots. The user said it worked well.
   - Source: `projects/l39-ejection-seat/`. That folder holds the script, `src/shots.js`, `src/jet.js` (jet, seat, parachutes, flame, smoke, clouds, airfield) and `pilot-outfit.patch`. Its `README.md` lists the fact sources.
   - Rebuild: `bash projects/l39-ejection-seat/make.sh` (~30 min). The output lands in `projects/l39-ejection-seat/build/`. The MP4 isn't stored in git.
   - The camera fix in the landing shot is included.

4. **Second video: "What happens inside a Tesla when you press the accelerator?"** 55.3 s, 1080x1920, 30 fps, 14 shots: car, x-ray, pedal sensor, battery cells, the DC problem, inverter switches, three waves into the coils, spinning field, rotor dragged along, launch, two-stage 9:1 gears, regenerative braking, payoff.
   - Source: `projects/tesla-accelerator/` (`script.json`, `src/shots.js`, `src/ev.js` with the car, battery, inverter, motor, gears and road, `driver-outfit.patch`). `README.md` lists the facts and what is simplified.
   - Rebuild: `bash projects/tesla-accelerator/make.sh` (~30 min).
   - Lesson: at 9:16, stack things vertically (battery below the motor, waves coming down from above) instead of side by side.

## Settings that worked
- Voice: Kokoro `am_michael`, speed `1.12`. Word timings from Parakeet (`kit/words.py`).
- Render: `GL=swiftshader`, 30 fps, 4 parallel segments. Final mux as in SKILL.md step 7.
- Fact sources: the DCS L-39 flight manual (VS1-BRI seat section) and Eduard's VS-1 BRI seat data.

## Known limits
- The canopy jettison and the seat's exact shape are simplified cartoon versions.
- The request mentioned "armour, arrow and impact conditions", which was leftover wording from the armour example. The video explains the seat's real limits instead: 150 km/h on the ground, 1,500 m in a spin, and the two-seat blocking system.
- `git push` returned 403 in the last session. Commits went up through the GitHub MCP tool instead. See CLAUDE.md.

## Next
Ask the user for the next topic, or for changes to the Tesla or L-39 videos (voice, pacing, ending). For a new topic, copy `projects/l39-ejection-seat/` as the template and follow `skills/zach-d-films/SKILL.md`.
