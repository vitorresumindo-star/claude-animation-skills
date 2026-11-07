# Handoff: where we are

_Last updated 2026-11-07, branch `claude/determined-bell-oz0brg`. This branch merges the two earlier session branches (`claude/zach-d-films-test-render-yjax2g` and `claude/zach-d-films-test-render-4bpxsn`), so every project is in one place._

## Done
1. **Setup proven in the cloud.** `install.sh --voice` worked with the default network policy, with no blocked downloads. ffmpeg 6.1, Node 22, Python 3.13, 4 CPUs, no GPU. `scripts/cloud-setup.sh` now repeats those steps and skips what's already done.
2. **Test render.** An 8 s clip of the zach-d-films armour example with Kokoro narration rendered and checked (frames, audio, decode).
3. **First complete video: "How does the L-39's ejection seat work?"** 51.9 s, 1080x1920, 30 fps, narration and synced captions, 11 shots. The user said it worked well.
   - Source: `projects/l39-ejection-seat/`. That folder holds the script, `src/shots.js`, `src/jet.js` (jet, seat, parachutes, flame, smoke, clouds, airfield) and `pilot-outfit.patch`. Its `README.md` lists the fact sources.
   - Rebuild: `bash projects/l39-ejection-seat/make.sh` (~30 min). The output lands in `projects/l39-ejection-seat/build/`. The MP4 isn't stored in git.
   - The camera fix in the landing shot is included.
4. **"What happens inside a Tesla when you press the accelerator?"** 55.3 s, 1080x1920, 30 fps, 14 shots: car, x-ray, pedal sensor, battery cells, the DC problem, inverter switches, three waves into the coils, spinning field, rotor dragged along, launch, two-stage 9:1 gears, regenerative braking, payoff.
   - Source: `projects/tesla-accelerator/` (`script.json`, `src/shots.js`, `src/ev.js` with the car, battery, inverter, motor, gears and road, `driver-outfit.patch`). `README.md` lists the facts and what is simplified.
   - Rebuild: `bash projects/tesla-accelerator/make.sh` (~30 min).
   - Lesson: at 9:16, stack things vertically (battery below the motor, waves coming down from above) instead of side by side.
5. **"What if your brain suddenly stopped feeling pain?"** 49 s, 1080x1920, 30 fps, 18 shots: the hook (a kettlebell lands on an arm), a hot pan, a dive into the skin, nociceptors and heat channels, an X-ray reflex arc to the spinal cord and the brain, a DNA helix with the SCN9A "broken gene", a boy on hot coals, and the nervous system as an alarm.
   - Source: `projects/no-pain/` (`script.json`, `src/shots.js`, `src/pain.js`, `make.sh`, and `README.md` with the fact sources and the simplified parts).
   - The casual outfit is made in `pain.js` by restyling the engine person, so this project needs no patch.
   - Rebuild: `bash projects/no-pain/make.sh` (~30 min).
6. **"What would you see falling into a black hole?"** 50.5 s, 1080x1920, 30 fps, 17 shots. Hook: "As you fall toward a black hole, the universe starts looking very strange."
   - Source: `projects/black-hole/` (`script.json`, `src/shots.js`, `src/space.js`, `make.sh`, and `README.md` with the facts and the simplified parts).
   - The sky shows real gravitational lensing: `space.js` traces light paths around a Schwarzschild black hole every frame and bends a procedural star cube map. Use `spaceStage(makeStage, {M, bh})` and call `lens.update(camera)` after placing the camera. Pick distances with care, because the shadow is huge up close: at 12 M it already fills a 50° view.
   - `astronaut()` restyles the engine person into a white suit and bubble helmet, with its own material copies so `redshift(k, fade)` can tint it red or fade it.
   - Rebuild: `bash projects/black-hole/make.sh` (~30 min).

7. **"What would happen if Jesus were never born?"** 58.2 s, 1080x1920, 30 fps, 21 shots, the first zach-d-films video with a **music score and sound effects** (all synthesised in `audio.py`). Hook: "If Jesus had never been born, this year wouldn't be 2026." Jesus is never shown: the star over Bethlehem goes out in the first shot and shines again in the last.
   - Source: `projects/jesus-never-born/` (`script.json`, `src/shots.js`, `src/fx.js`, `src/people.js`, `src/sets.js`, `src/sets2.js`, `src/maps.js`, `src/geo.js`, `audio.py`, `index.html`, `fonts/`, `make.sh`, and `README.md` with the fact sources and the simplified parts).
   - Reusable pieces: the golden dissolve (`dissolvable()` erases any object, shadows included), `dress()` for new characters without engine patches, the split-flap year board, a Natural Earth table map with a computed spread, a globe, auto-fitting canvas text.
   - Rebuild: `bash projects/jesus-never-born/make.sh` (~40 min). It renders **shot by shot**, so `ONLY=7,9 bash projects/jesus-never-born/make.sh` re-renders just those shots; `make.sh audio` remakes only the sound and the mux.

## Settings that worked
- Voice: Kokoro `am_michael`, speed `1.12`. Word timings from Parakeet (`kit/words.py`). Spell numbers out in `script.json` and check what the recogniser hears without the script: Kokoro said "do re mi" as "Durimai" until it was written "doh ray mee".
- Render: `GL=swiftshader`, 30 fps, 4 parallel segments. Final mux as in SKILL.md step 7.
- Fact sources: L-39, the DCS flight manual (VS1-BRI seat section) and Eduard's VS-1 BRI seat data. Pain video: Cox et al. 2006 (Nature, SCN9A) and the TRPV1 literature (about 43 °C).
- Inside-the-body shots: `insideSky()` in `projects/no-pain/src/pain.js` recolors the sky (tissue red or X-ray navy) and hides the ground shadow. The X-ray uses an additive fresnel material, so there are no transparency sorting problems.

## Known limits
- The canopy jettison and the seat's exact shape are simplified cartoon versions.
- The request mentioned "armour, arrow and impact conditions", which was leftover wording from the armour example. The video explains the seat's real limits instead: 150 km/h on the ground, 1,500 m in a spin, and the two-seat blocking system.
- The first `cloud-setup.sh` run can fail with "curl: (56) Recv failure" while downloading the models. Run it again: it skips what's already done.
- `git push` returned 403 in an earlier session. Commits went up through the GitHub MCP tool instead. See CLAUDE.md.

## Next
Ask the user for the next topic, or for changes to an earlier video (voice, pacing, ending, music). For a new topic, copy `projects/jesus-never-born/` as the template (shot-by-shot render, music and effects) and follow `skills/zach-d-films/SKILL.md`.
