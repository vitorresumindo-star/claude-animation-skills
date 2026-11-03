# L-39 ejection seat (zach-d-films project)

A 51.9 s vertical 3D explainer, "How does the L-39's ejection seat work?", made with `/zach-d-films`, starting from the armour example in `skills/zach-d-films/engine`.

Source only: no voiceover, video, models or `node_modules` are stored here. Only the files that differ from the engine are kept.

- `script.json`: the narration (12 sentences).
- `src/shots.js`: captions timed to the voiceover's word timings, plus 11 shots.
- `src/jet.js`: new props, including a cartoon two-seat jet trainer, the ejection seat with its double handle and rocket, the drogue and main parachutes, rocket flame, smoke, clouds and an airfield.
- `pilot-outfit.patch`: adds a `'pilot'` outfit (flight suit, boots and helmet) to the engine's `src/human.js`.

## Facts used
Taken from the DCS L-39 flight manual (VS1-BRI seat section) and the seat data published by Eduard:
- The pilot pulls a double handle at the front of the seat, in the middle. After that every step is automatic up to the parachute, and the canopy is jettisoned first.
- The seat has a rocket booster (URM-1). Maximum G on ejection is 17 g.
- The stabilizing chute is 0.5 m², the main chute is 50 m², and the descent rate is about 6 m/s.
- At zero height the jet needs at least 150 km/h so the canopy separates properly.
- If the aircraft does not recover from a spin by 1,500 m, the pilots must eject.
- A blocking system stops both seats firing at once. After a manual canopy jettison, the rear pilot ejects first.

## Rebuild
From the repository root, after `bash scripts/cloud-setup.sh`:
```bash
bash projects/l39-ejection-seat/make.sh                 # full video, ~30 min -> projects/l39-ejection-seat/build/l39-ejection-seat.mp4
bash projects/l39-ejection-seat/make.sh stills 1.5,17.5 # look at a few frames first
TO=2 bash projects/l39-ejection-seat/make.sh            # quick 2-second test
```
`make.sh` copies `skills/zach-d-films/engine`, adds this folder's files, applies `pilot-outfit.patch`, makes the Kokoro voice (`am_michael`, speed 1.12), works out word timings, renders 4 segments in parallel with `GL=swiftshader`, joins them, adds the voice and checks the result.
