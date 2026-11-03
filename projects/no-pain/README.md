# What if your brain stopped feeling pain? (zach-d-films project)

A 49 s vertical 3D explainer made with `/zach-d-films`, starting from the engine in `skills/zach-d-films/engine`.

Source only: no voiceover, video, models or `node_modules` are stored here. Only the files that differ from the engine are kept.

- `script.json`: the narration (11 sentences, 143 words).
- `src/shots.js`: captions timed to the voiceover's word timings, plus 18 shots.
- `src/pain.js`: new props. It has a casual person (T-shirt, jeans, sneakers; made by restyling the engine's person, with no patch), a stove and hot pan, a kettlebell, an arm cast, the X-ray hologram look with a nervous system that follows the pose plus a brain, the skin cross-section (epidermis, dermis, fat, vessels, hair, nociceptors and a heat front), the nerve-ending close-up with heat channels and ions, a DNA helix, a hot-coal bed and a house.

## Shots
Kettlebell on the arm (hook) · hero pose · reaching for the hot pan · fingers touch the pan · dive into the fingertip · nociceptors in the skin · heat front at 43 °C · channels open, the signal fires · X-ray: the signal goes up the arm to the spinal cord, and the reflex yanks the hand · the pain reaches the brain · "ouch" · DNA with one broken rung · chewing the tongue · walking on a broken shin · a boy on hot coals · a house at dusk · arm in a cast · the whole nervous system as an alarm.

## Facts used
- Heat-sensing nociceptors (TRPV1 channels) switch on at about 43 °C, close to the temperature where heat starts to hurt (Caterina et al. 1997, *Nature*; reviews of TRPV1).
- The withdrawal reflex is wired in the spinal cord, so the hand moves before the brain registers the pain (standard neuroscience texts, e.g. Purves *Neuroscience*).
- Congenital inability to feel pain can come from loss of one gene, SCN9A (the Nav1.7 sodium channel). Cox et al. 2006, *Nature*, "An SCN9A channelopathy causes congenital inability to experience pain".
- The index case in that paper was a boy in northern Pakistan who did street performances, putting knives through his arms and walking on burning coals. He died on his 14th birthday after jumping off a house roof. His story came from family accounts, not a clinical exam.
- Tongue and lip biting, unnoticed fractures and missed infections are classic complications of congenital insensitivity to pain.

## Simplified for the cartoon
- The skin layers, nerve endings and channels are drawn in a cartoon style and not to scale. The "ions" are glowing dots, and the signal is drawn as one glowing ring.
- The X-ray shows one nerve path per limb and a single spinal cord line. Real nerves branch far more.
- Reflex timing is slowed down so you can watch it.
- The boy is shown only walking on coals. His death is told by the voice over a quiet house shot.

## Rebuild
From the repository root, after `bash scripts/cloud-setup.sh`:
```bash
bash projects/no-pain/make.sh                     # full video, ~30 min -> projects/no-pain/build/no-pain.mp4
bash projects/no-pain/make.sh stills 1.3,19.4     # look at a few frames first
TO=2 bash projects/no-pain/make.sh                # quick 2-second test
```
