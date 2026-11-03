# What would you see falling into a black hole? (zach-d-films project)

A 50.5 s vertical 3D explainer made with `/zach-d-films`, starting from the engine in `skills/zach-d-films/engine`.

Source only: no voiceover, video, models or `node_modules` are stored here. Only the files that differ from the engine are kept.

- `script.json`: the narration (11 sentences, 150 words). Hook: "As you fall toward a black hole, the universe starts looking very strange."
- `src/shots.js`: captions timed to the voiceover's word timings, plus 17 shots.
- `src/space.js`: the space look and new props:
  - **Star sky.** A procedural cube map (stars in four layers, the Milky Way band with dust lanes, faint nebulae, a spiral galaxy, and one bright blue "twin" star). It is drawn once per render process in a separate WebGL context, then mip-mapped.
  - **Gravitational lensing.** `traceRay` integrates real light paths around a Schwarzschild black hole (`d²u/dφ² = 3u² − u`, M = 1). Each frame, `lensTable(r0)` traces 2,048 rays for the camera's current distance and puts the result in a lookup texture. The sky shader uses it to bend every pixel's view ray, or turns the pixel black if the ray is captured. The shadow's size, the Einstein ring and the second image of a star all come out of this calculation, not out of hand-drawn art. `imageAngles` finds both images of a star so the rings in shot 4 land on them.
  - An astronaut (the engine person restyled with a white suit, a bubble helmet, a backpack and its own material copies, so it can be tinted red or faded per shot), force arrows, light tubes, a spiral galaxy, the event horizon as a glowing grid, a cartoon rocket, a dust stream, and a black-hole "ball" for the size comparison.

## Shots
Astronaut drifts toward the hole, sky warped · a light ray bends around the hole, and the star appears somewhere else · a galaxy slides behind the hole and becomes an Einstein ring · two images of one star circled · first-person approach as the shadow swells · astronaut against the shadow's bright edge · small vs giant hole · feet-first fall toward a small hole · pull arrows, feet vs head · spaghetti, then a dust stream above the horizon · tiny astronaut over a giant shadow · zoom into the Milky Way's centre · calm astronaut, tiny equal arrows · crossing the horizon grid, waving · inside: every light path (and a flashlight beam) curves inward · a friend by a rocket · the friend's view: the astronaut slows, freezes at the edge, reddens and fades.

## Facts used
- Horizon radius is 2GM/c², about 3 km per solar mass: about 30 km for a 10-solar-mass hole, and about 12 million km for Sagittarius A* (about 4 million solar masses; EHT Collaboration 2022, *ApJL* 930 L12; GRAVITY Collaboration 2019).
- The shadow is larger than the horizon. Seen from far away, its radius is √27·GM/c² ≈ 2.6 horizon radii, set by the photon sphere at 1.5 horizon radii (standard GR texts, e.g. Misner, Thorne & Wheeler, *Gravitation*; Luminet 1979).
- Lensing makes arcs and Einstein rings, and a star behind the hole gives a primary and a secondary image on opposite sides.
- Tides: the difference in pull across your body goes as 2GMh/r³. For a stellar-mass hole this tears a person apart hundreds of kilometres out, well before the horizon. For a supermassive hole the tide at the horizon is far below 1 g, so you cross it intact (e.g. Hawking, *A Brief History of Time*; Thorne, *Black Holes and Time Warps*).
- Inside the horizon every future path, including light, moves to smaller radius.
- A distant observer sees an infalling object slow down, freeze near the horizon, and become more and more redshifted and dim until it fades away.

## Simplified for the cartoon
- The lensing is computed for an observer who **hovers** at each distance. A freely falling observer would also see aberration from their own speed, which shifts the view. Light travel time, Doppler shifts and the brightening of the sky are not shown.
- The bright ring at the shadow's edge has a small brightness boost on star cores so it reads on a phone.
- Sizes are not to scale. The astronaut is huge compared with the small hole, and the spaghetti stretch is drawn as a smooth cartoon stretch that dissolves into dust.
- The event horizon is drawn as a glowing grid. In reality there is nothing there to see or feel.
- The inside shot (curving light paths, the flashlight beam that turns back) is a diagram, not a view. The size comparison and the galaxy zoom also use stylised black balls instead of lensing.
- Space has no "sun" lighting the astronaut. A key light is added so the characters are visible.

## Rebuild
From the repository root, after `bash scripts/cloud-setup.sh`:
```bash
bash projects/black-hole/make.sh                       # full video, ~30 min -> projects/black-hole/build/black-hole.mp4
bash projects/black-hole/make.sh stills 2,5.5,16,28,37  # look at a few frames first
TO=2 bash projects/black-hole/make.sh                  # quick 2-second test
```
