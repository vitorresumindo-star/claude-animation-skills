# Tesla accelerator (zach-d-films project)

A 55.3 s vertical 3D explainer, "What happens inside a Tesla when you press the accelerator?", made with `/zach-d-films`, starting from the engine in `skills/zach-d-films/engine`.

Source only: no voiceover, video, models or `node_modules` are stored here. Only the files that differ from the engine are kept.

- `script.json`: the narration (11 sentences).
- `src/shots.js`: captions timed to the voiceover's word timings, plus 14 shots.
- `src/ev.js`: new props. A generic white electric sedan (not a copy of any real car) with an x-ray mode, the battery pack (instanced cells with glowing caps), pedal and computer, the inverter (6 switches driven by real PWM logic), a 6-coil three-phase motor with a two-pole magnet rotor and a field arrow, spur gears, glowing current beads and a road with trees.
- `driver-outfit.patch`: adds a `'driver'` outfit (blue top, jeans, white sneakers) to the engine's `src/human.js`.

## Facts used
- The rear motor is a permanent-magnet synchronous motor and the gearbox ratio is about 9:1 (9.03:1 in some editions). Source: Tesla Model 3 owner's manual, specifications page, and the InsideEVs drive-unit teardown.
- Motor speed: InsideEVs works out about 18,400 rpm at the top speed the gearing allows. Tesla doesn't publish a redline, so the script says "about eighteen thousand".
- The main inverter turns the battery's DC into three-phase AC. The Model 3 was the first car to use silicon-carbide MOSFETs in an in-house inverter (IDTechEx, STMicroelectronics).
- The pedal has no mechanical link. It is a position sensor, normally with two independent tracks so the controller can cross-check them (drive-by-wire pedal sensor patents). This is industry practice; it isn't from a Tesla document.
- Thousands of cylindrical cells: a Model 3 Long Range pack has about 4,400 cells.
- Lifting off the pedal gives regenerative braking: the motor acts as a generator and charges the battery.

## Simplified on screen
- The motor is drawn with 6 coils and a 2-pole rotor so the spinning field is easy to see. Real Tesla motors have many more slots and poles.
- The gearbox shows two stages, 10→30 and 10→30, which makes 9:1. The real unit is also two stages, but with different tooth counts and helical gears.
- The inverter's switching is slowed right down. In reality it switches thousands of times a second.
- The pedal and computer are cartoon boxes. The car is a generic sedan with no branding.

## Rebuild
From the repository root, after `bash scripts/cloud-setup.sh`:
```bash
bash projects/tesla-accelerator/make.sh                  # full video, ~30 min -> projects/tesla-accelerator/build/tesla-accelerator.mp4
bash projects/tesla-accelerator/make.sh stills 1.2,24,54 # look at a few frames first
TO=2 bash projects/tesla-accelerator/make.sh             # quick 2-second test
```
