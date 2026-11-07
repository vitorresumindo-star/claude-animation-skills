# What would happen if Jesus were never born? (zach-d-films project)

A 58 s vertical 3D explainer made with `/zach-d-films`, starting from the engine in `skills/zach-d-films/engine`. It is the first zach-d-films video with a music score and sound effects.

Source only: no voiceover, video, models or `node_modules` are stored here. Only the files that differ from the engine are kept.

- `script.json`: the narration (15 sentences, 173 words). Numbers are spelled out for the voice ("twenty twenty-six") and "do re mi" is written "doh ray mee" so Kokoro says it right. The captions show digits.
- `src/shots.js`: captions timed to the voiceover's word timings, plus 21 shots.
- `src/fx.js`: the look of the video. A **golden dissolve** that erases things from history (a shader patch that works on any material and its shadow), golden motes, sparkle bursts, a spiral of sparkles, canvas text that fits itself to its canvas, a star field, the Bethlehem star, light shafts, lightning and camera-locked titles.
- `src/people.js`: every character is the engine's person restyled by `dress()`: the narrator's guy, Santa, Saint Nicholas (mitre, cope, crozier), a monk with a tonsure, a nun, a Roman legionary, a local man in a tunic, graduates with preaching bands, patients and marble statues. `surprise()` raises the brows (the engine's mouth control lowers them, which reads as angry).
- `src/sets.js`, `src/sets2.js`: Bethlehem at night (stable, manger, sheep, a town on a hill), a split-flap year board that really flips, the timeline, a church, a hammock, a Christmas tree, presents and an Easter basket, a road with a highway sign, a Roman road and milestone, a chapel with stained glass (geometric, no figures), a four-line staff with the six notes, a medieval hospital, a brick college hall, a temple and the old gods' props.
- `src/maps.js`, `src/geo.js`: a 3D table map of the Roman world and a globe. Coastlines come from Natural Earth (public domain), simplified by `geo-prep.py`. The gold spread on the map is computed: a shortest-path search out of Jerusalem over a lon/lat grid (Roman roads and sea lanes fast, countryside slow), limited to the empire's borders around AD 380, gives every point an arrival time that the land shader, the roads and the city lights read.
- `audio.py`: the score and effects, all synthesised: choir, strings, bells, plucks, organ, timpani, the monk singing the actual hexachord (C D E F G A), flap clacks timed to the board, magic poofs, a church bell, sleigh bells, footsteps, thunder, rain, crickets and birds. A synthetic reverb, then ducking under the voice. It prints how far the voice sits above everything else (median about 14 dB while speaking).
- `index.html`: the engine page plus the fonts (Montserrat 800/900 for signs, Cinzel for Roman lettering), preloaded so canvas text uses them. `fonts/` holds Cinzel (SIL Open Font License, `fonts/OFL-cinzel.txt`).

## Shots
Bethlehem: the star and the manger light go out · the guy and the year board, 2026 · flying the timeline from AD 1 to 2026 · the star vanishes, back to the founding of Rome, 753 BC · the board flips to 2779, a laurel lands on his head · a church dissolves into gold · "hidden all around you": icons orbit him · his Sunday hammock vanishes and he drops · the Christmas tree dissolves, the Easter eggs pop · Santa turns into Saint Nicholas · jogging under an EXTRA MILE sign · a Roman milestone, a local man carries a legionary's pack · a monk sings do re mi from a hymn book · a sister tends a patient in a medieval hospital · graduates in ministers' bands toss their caps · from the manger up to one point of light · the light spreads along the Roman roads, AD 33 to AD 380 · Jupiter and Thor in a storm · the globe: 2.3 billion Christians, 2 billion Muslims · the board flips again · the star shines again over Bethlehem.

## Facts used
- **AD dating** counts from the traditional year of Jesus's birth (the Anno Domini system of Dionysius Exiguus, AD 525). Counting from the founding of Rome (753 BC, Varro's date, "ab urbe condita") instead, 2026 would be 2026 + 753 = **2779**. Romans more often named years after consuls; the video says "we might count", which is a counterfactual, not a claim about Roman practice.
- **Sunday rest.** Early Christians gathered on Sunday, the day of the resurrection; Constantine made Sunday a legal day of rest in 321. Historians debate how much his law also honoured the sun god, so the script says only "That's the Christian day of rest".
- **Santa Claus** comes from Saint Nicholas of Myra, a 4th-century bishop (Sinterklaas).
- **"Go the extra mile"** comes from Matthew 5:41 in the Sermon on the Mount ("whoever forces you to go one mile, go with him two"). The verb refers to forced service; the soldier making a local carry his pack is the common historical reading of the verse, shown as such.
- **Do re mi.** The note names come from the hymn *Ut queant laxis* (to John the Baptist), used by the Benedictine monk Guido of Arezzo around 1025 to teach singing: ut, re, mi, fa, sol, la are the first syllables of its lines. "Ut" was later replaced by "do".
- **Hospitals.** Basil of Caesarea's Basileias (about 369 to 372) is usually called the first hospital open to the public, and Christian institutions spread hospitals for the poor (e.g. Risse, *Mending Bodies, Saving Souls*). The script says "many of the first public hospitals".
- **Harvard** was founded in 1636 and in its early years mostly trained Congregational ministers; the 1643 pamphlet *New England's First Fruits* gives the founders' fear of "an illiterate ministry".
- **Spread and AD 380.** The message spread along the empire's roads and sea lanes; the Edict of Thessalonica (380) made Nicene Christianity the state religion, under 400 years after Jesus's death (about AD 30 to 33).
- **Today.** Pew Research Center, *How the Global Religious Landscape Changed From 2010 to 2020* (June 2025): 2.3 billion Christians (28.8%) and about 2.0 billion Muslims (25.6%) in 2020. Islam honours Jesus (Isa) as a prophet.
- "Europe might still pray to Jupiter and Thor" is speculation, and is said as "might".

## Simplified for the cartoon
- Jesus is never shown. The story is told with the star, the light over the manger and the things that came after.
- The map's spread is a computed stylisation: real conversion was patchy, and cities converted long before the countryside (fittingly, "pagan" comes from the Latin for a country dweller). The year counter runs evenly from AD 33 to AD 380; places do not light up on their historical dates. The empire's border is approximate, and Christianity also spread outside it (Armenia, Ethiopia, Persia).
- The globe's lights are placed by region to show where most Christians and most Muslims live; they are not a population map.
- Sizes and places are not to scale. The Roman temple on the timeline and in the storm are generic, not a specific building. The college hall is a generic Georgian brick building, not a copy of a real one.
- The monk's note names use "do", as people know them today; Guido's first syllable was "ut".

## Rebuild
From the repository root, after `bash scripts/cloud-setup.sh`:
```bash
bash projects/jesus-never-born/make.sh                      # full video, ~40 min -> projects/jesus-never-born/build/jesus-never-born.mp4
bash projects/jesus-never-born/make.sh stills 0.5,12.6,41   # look at a few frames first
bash projects/jesus-never-born/make.sh audio                # remake only the music + effects and the final mux
ONLY=7,9 bash projects/jesus-never-born/make.sh             # re-render shots 7 and 9 only (0-based), keep the others
```
