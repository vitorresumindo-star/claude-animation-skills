# Music and sound effects for "What would happen if Jesus were never born?", all synthesised in code,
# placed on the voiceover's timeline and mixed under the voice. Run from the build folder: writes audio/mix.wav.
#   kit/.venv/bin/python audio.py
import numpy as np, soundfile as sf
from scipy import signal

SR = 44100
DUR = 58.19 + 0.4
N = int(DUR * SR)
rng = np.random.default_rng(7)
T = lambda n: np.arange(n) / SR
midi = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, o=2): b, a = signal.butter(o, min(f / (SR / 2), 0.99), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi, o=2): b, a = signal.butter(o, [lo / (SR / 2), min(hi / (SR / 2), 0.99)], 'band'); return signal.lfilter(b, a, x)
def env(n, a=0.01, r=0.2, hold=None):
    t = T(n); e = np.minimum(1, t / max(a, 1e-4))
    if hold is None: return e * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
    rel = np.clip((t - hold) / max(r, 1e-4), 0, 1); return e * (1 - rel)
def adsr(n, a, rel):
    t = T(n); d = n / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((d - t) / max(rel, 1e-4), 0, 1)


class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, x, at, g=1.0, pan=0.0):
        i = int(round(at * SR));
        if i >= N: return
        if i < 0: x = x[-i:]; i = 0
        j = min(N, i + len(x)); x = x[:j - i] * g
        self.L[i:j] += x * np.sqrt(0.5 * (1 - pan)); self.R[i:j] += x * np.sqrt(0.5 * (1 + pan))


music, sfx, amb = Bus(), Bus(), Bus()

# ---------------- instruments ----------------
def saw(f, n, detune=(0.0,), vib=0.0, vr=5.0):
    t = T(n); out = np.zeros(n)
    for d in detune:
        ph = np.cumsum(f * (1 + d) * (1 + vib * np.sin(2 * np.pi * vr * t + d * 50))) / SR
        out += 2 * (ph % 1) - 1
    return out / len(detune)
def strings(ms, dur, g=1.0, bright=1800, a=0.6, r=0.8):
    n = int(dur * SR); x = np.zeros(n)
    for m in ms: x += saw(midi(m), n, (-0.006, 0.0, 0.007), 0.004)
    return lp(x / len(ms), bright) * adsr(n, a, r) * g
FORMANTS = {'a': [(800, 80, 1.0), (1150, 90, 0.5), (2900, 120, 0.25)], 'o': [(450, 70, 1.0), (800, 80, 0.45), (2830, 100, 0.15)], 'u': [(325, 60, 1.0), (700, 70, 0.3), (2530, 100, 0.1)]}
def choir(ms, dur, vowel='a', g=1.0, a=0.5, r=0.7, voices=3):
    n = int(dur * SR); src = np.zeros(n)
    for m in ms:
        for k in range(voices): src += saw(midi(m), n, (0.004 * (k - 1),), 0.006, 4.6 + 0.4 * k)
    out = np.zeros(n)
    for f, bw, amp in FORMANTS[vowel]: out += bp(src, f - bw, f + bw) * amp
    return out / (len(ms) * voices) * adsr(n, a, r) * g * 3.0
def voice(m, dur, vowel='a', g=1.0):        # one sung note: the monk
    n = int(dur * SR); t = T(n)
    f = midi(m) * (1 + 0.012 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.15))
    ph = np.cumsum(f) / SR; src = 2 * (ph % 1) - 1
    out = sum(bp(src, fr - bw, fr + bw) * amp for fr, bw, amp in FORMANTS[vowel])
    return out * adsr(n, 0.05, 0.12) * g * 3
def bell(f, dur=2.0, g=1.0, bright=1.0):
    n = int(dur * SR); t = T(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 2.2), (2.0, 0.45 * bright, 3.5), (2.76, 0.35 * bright, 5), (5.4, 0.18 * bright, 9), (8.93, 0.08 * bright, 14)])
    return x * np.minimum(1, t / 0.002) * g * 0.4
def church_bell(f=220, dur=4.5, g=1.0):
    n = int(dur * SR); t = T(n)
    x = sum(a * np.sin(2 * np.pi * f * r * t + r) * np.exp(-t * d) for r, a, d in [(0.5, 0.6, 0.7), (1, 1, 0.9), (1.19, 0.6, 1.2), (1.5, 0.45, 1.4), (2.0, 0.35, 1.8), (2.5, 0.2, 2.4), (3.0, 0.15, 3)])
    x += hp(rng.standard_normal(n), 2000) * np.exp(-t * 40) * 0.3
    return x * g * 0.35
def pluck(f, dur=0.6, g=1.0, bright=0.6):
    n = int(dur * SR); t = T(n)
    x = sum((bright ** (k - 1)) / k * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + 2.2 * k)) for k in range(1, 9))
    return x * np.minimum(1, t / 0.003) * g * 0.5
def organ(ms, dur, g=1.0):
    n = int(dur * SR); t = T(n); x = np.zeros(n)
    for m in ms:
        f = midi(m)
        for k, a in [(1, 1), (2, 0.6), (3, 0.3), (4, 0.25), (6, 0.12), (8, 0.08)]: x += a * np.sin(2 * np.pi * f * k * t + k)
    return lp(x / len(ms), 3000) * adsr(n, 0.25, 0.6) * g * 0.25
def kick(f0=55, g=1.0):
    n = int(0.5 * SR); t = T(n); f = f0 * (1 + 2.5 * np.exp(-t * 28))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + lp(rng.standard_normal(n), 1500) * np.exp(-t * 60) * 0.3) * g
def timpani(f=73.4, g=1.0, dur=1.6):
    n = int(dur * SR); t = T(n)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 3) + 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4)) * np.exp(-t * 2.2)
    x += lp(rng.standard_normal(n), 800) * np.exp(-t * 30) * 0.5
    return x * np.minimum(1, t / 0.004) * g * 0.8
def boom(g=1.0, dur=2.5):
    n = int(dur * SR); t = T(n); f = 42 * (1 + 1.5 * np.exp(-t * 6))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) + lp(rng.standard_normal(n), 300) * np.exp(-t * 4) * 0.6) * g
def noise(n): return rng.standard_normal(n)
def crash(dur=3.0, g=1.0):
    n = int(dur * SR); t = T(n); return hp(noise(n), 4000) * np.exp(-t * 1.4) * np.minimum(1, t / 0.002) * g * 0.35
def swell(dur=1.5, g=1.0):          # reversed cymbal
    n = int(dur * SR); t = T(n); return hp(noise(n), 3500) * (t / dur) ** 3 * g * 0.4
def whoosh(dur=0.5, up=True, g=1.0, lo=300, hi=5000):
    n = int(dur * SR); t = T(n); x = noise(n); k = t / dur if up else 1 - t / dur
    a, b = bp(x, lo, lo * 3), bp(x, hi / 3, hi)
    return (a * (1 - k) + b * k) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5 * g * 1.6
def riser(dur=2.0, g=1.0, f0=200, oct_=2.5):
    n = int(dur * SR); t = T(n); f = f0 * 2 ** (t / dur * oct_)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + bp(noise(n), 900, 6000) * 0.35 * t / dur) * (t / dur) ** 2 * g
def shimmer(dur=1.0, g=1.0, f0=1600, n_=28, seed=1, up=True):
    out = np.zeros(int((dur + 0.8) * SR)); r = np.random.default_rng(seed)
    for i in range(n_):
        at = r.random() * dur if not up else (i / n_) * dur; f = f0 * 2 ** ((i / n_) * 1.6 if up else r.random() * 1.6)
        x = bell(f, 0.7, 0.3 * (0.6 + 0.4 * r.random()), 0.6); j = int(at * SR); out[j:j + len(x)] += x[:len(out) - j]
    return out * g
def poof(g=1.0, seed=3):
    n = int(0.6 * SR); t = T(n)
    x = lp(noise(n), 1200) * np.exp(-t * 9) * np.minimum(1, t / 0.01) * 0.8
    out = np.zeros(int(1.2 * SR)); out[:n] += x
    s = shimmer(0.25, 0.7, 2000, 8, seed, up=True); out[:len(s)] += s[:len(out)]
    return out * g
def clack(g=1.0, f=2600):
    n = int(0.05 * SR); t = T(n)
    return (bp(noise(n), 1500, 6000) * np.exp(-t * 180) + np.sin(2 * np.pi * f * t) * np.exp(-t * 120) * 0.4 + np.sin(2 * np.pi * 380 * t) * np.exp(-t * 90) * 0.5) * g
def thud(g=1.0, f0=70):
    n = int(0.45 * SR); t = T(n); f = f0 * (1 + 1.5 * np.exp(-t * 30))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) + lp(noise(n), 900) * np.exp(-t * 40) * 0.6) * g
def step(g=1.0, bright=1500):
    n = int(0.12 * SR); t = T(n)
    return (lp(noise(n), bright) * np.exp(-t * 60) + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 50) * 0.6) * g
def jingle(dur=1.0, g=1.0, seed=4):
    out = np.zeros(int((dur + 0.4) * SR)); r = np.random.default_rng(seed)
    for i in range(int(dur * 22)):
        at = (i / 22) + r.random() * 0.03; f = 3800 + r.random() * 2600
        n = int(0.12 * SR); t = T(n); x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.47 * t)) * np.exp(-t * 40) * (0.5 + 0.5 * (i % 4 == 0))
        j = int(at * SR); out[j:j + n] += x[:len(out) - j]
    return hp(out, 2500) * g * 0.35
def tick(g=1.0):
    n = int(0.03 * SR); t = T(n); return (hp(noise(n), 3000) * np.exp(-t * 250) + np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 200) * 0.5) * g
def thunder(dur=3.5, g=1.0, seed=5, crack_g=1.0, rumble_g=1.0, decay=1.5):
    n = int(dur * SR); t = T(n); r = np.random.default_rng(seed)
    crack = hp(r.standard_normal(n), 1200) * np.exp(-t * 14) * 0.9 * crack_g
    rum = lp(r.standard_normal(n), 160, 3) * 5 * (np.exp(-t * decay) * np.minimum(1, t / 0.08)) * rumble_g
    mod = 0.6 + 0.4 * lp(np.abs(r.standard_normal(n)), 4)
    return (crack + rum * mod) * g
def rain(dur, g=1.0):
    n = int(dur * SR); x = hp(noise(n), 1800) * 0.25
    drops = (rng.random(n) > 0.9993) * rng.random(n) * 2.0; x += hp(drops, 2500)
    return x * adsr(n, 0.5, 0.5) * g
def crickets(dur, g=1.0, seed=6):
    n = int(dur * SR); t = T(n); r = np.random.default_rng(seed); x = np.zeros(n)
    for k in range(3):
        f = 4300 + 400 * k; rate = 16 + 3 * k; ph = r.random() * 6
        chirp = (np.sin(2 * np.pi * rate * t + ph) > 0.6) * (np.sin(2 * np.pi * 0.7 * t + ph) > -0.2)
        x += np.sin(2 * np.pi * f * t) * lp(chirp.astype(float), 60)
    return x * adsr(n, 0.3, 0.4) * g * 0.12
def birds(dur, g=1.0, seed=8):
    out = np.zeros(int(dur * SR)); r = np.random.default_rng(seed)
    at = 0.2
    while at < dur - 0.4:
        n = int(0.09 * SR); t = T(n); f0 = 2800 + r.random() * 1800
        f = f0 * (1 + 0.35 * np.sin(np.pi * t / 0.09)); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.09)
        for rep in range(1 + int(r.random() * 3)):
            j = int((at + rep * 0.11) * SR); out[j:j + n] += x[:len(out) - j] * 0.5
        at += 0.6 + r.random() * 1.1
    return out * g * 0.25
def fizz(dur=0.7, g=1.0):           # the star flickering out
    n = int(dur * SR); t = T(n)
    x = bp(noise(n), 2000, 9000) * (np.sin(2 * np.pi * 37 * t) > 0) * (1 - t / dur) ** 1.5
    f = 1400 * (1 - 0.8 * t / dur); x += np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * (1 - t / dur)
    return x * g


# ---------------- the score (seconds on the voiceover timeline) ----------------
B = 60 / 96      # beat
DM, BB, FM, CM = (50, 57, 62, 65), (46, 53, 58, 62), (41, 48, 57, 60), (48, 55, 60, 64)
def groove(t0, t1, prog, beats_per_chord=4, g=1.0, kick_on=True, clap=False, bells=True, pl=True):
    t, k = t0, 0
    while t < t1 - 0.05:
        ch = prog[(k // beats_per_chord) % len(prog)]; root = ch[0]
        beat = k % 4
        if pl:
            pat = [root + 12, root + 19, root + 24, root + 19]
            for e in range(2):
                tt = t + e * B / 2
                if tt < t1: music.add(pluck(midi(pat[(beat * 2 + e) % 4]), 0.5, 0.5, 0.55), tt, 0.55 * g, pan=-0.25 + 0.5 * e)
        if kick_on and beat in (0, 2): music.add(kick(52, 0.9), t, 0.4 * g)
        if clap and beat in (1, 3): music.add(bp(noise(int(0.15 * SR)), 900, 4000) * env(int(0.15 * SR), 0.002, 0.05), t, 0.18 * g)
        if k % beats_per_chord == 0:
            dur = min(beats_per_chord * B, t1 - t)
            music.add(strings([m + 12 for m in ch[1:]], dur + 0.3, 0.22, 1600, 0.25, 0.4), t, g, pan=0.1)
            music.add(pluck(midi(root), 1.2, 0.8, 0.4), t, 0.5 * g)
        if bells and k % 8 == 4:
            for i, m in enumerate([81, 77, 76, 74] if (k // 8) % 2 else [74, 76, 77, 81]):
                music.add(bell(midi(m), 1.4, 0.5, 0.7), t + i * B / 2, 0.45 * g, pan=0.3)
        t += B; k += 1

# A. Bethlehem: a hushed choir, then the light goes out
music.add(choir([62, 66, 69, 74], 1.75, 'a', 0.9, 0.35, 0.6), 0.0, 0.55)
music.add(shimmer(1.0, 0.6, 1800, 18, 2, up=False), 0.05, 0.5, pan=0.2)
sfx.add(fizz(0.7), 0.88, 0.35, pan=0.1)
sfx.add(whoosh(0.7, False, 1.0, 120, 2500), 0.95, 0.35)
sfx.add(boom(0.9, 2.2), 1.5, 0.4)
amb.add(crickets(1.95), 0.0, 1.0)
# B. the calendar, the timeline and Rome: a curious pulse
amb.add(birds(2.3), 1.95, 0.8)
groove(1.95, 4.25, [DM, BB], 4, 0.8, kick_on=False, bells=False)
sfx.add(clack(0.7), 3.37, 0.5); sfx.add(clack(0.6, 2300), 3.52, 0.45); sfx.add(clack(0.5, 2500), 3.9, 0.3)
sfx.add(whoosh(1.3, True, 1.0, 200, 6000), 4.45, 0.32)
music.add(strings([62, 65, 69], 1.8, 0.25, 2200, 0.3, 0.5), 4.25, 1.0)
for i, m in enumerate([62, 65, 69, 74, 77, 81]): music.add(bell(midi(m), 1.2, 0.5), 4.4 + i * 0.22, 0.4, pan=-0.3 + 0.12 * i)
sfx.add(poof(1.0, 5), 6.38, 0.6)
sfx.add(whoosh(1.1, False, 1.0, 150, 5000), 6.85, 0.55)
sfx.add(thud(0.8, 45), 7.62, 0.5); sfx.add(lp(noise(int(0.8 * SR)), 300) * env(int(0.8 * SR), 0.05, 0.3), 7.6, 0.6)
music.add(strings([57, 62, 65], 2.9, 0.22, 1400, 0.4, 0.6), 6.05, 1.0)
music.add(timpani(73.4, 0.9), 7.62, 0.6)
groove(8.95, 11.15, [DM, CM], 4, 0.8, kick_on=True, bells=False)
for i, a in enumerate([0, 7, 5, 3]):                 # the board clatters from 2026 to 2779
    for s in range(a): sfx.add(clack(0.55, 2300 + 120 * s), 9.4 + i * 0.07 + s * 0.075, 0.42, pan=-0.3 + 0.2 * i)
music.add(swell(0.7, 1.0), 9.35, 0.4); music.add(crash(2.0, 0.8), 10.05, 0.4)
music.add(bell(midi(86), 1.5, 0.8), 10.3, 0.4); sfx.add(shimmer(0.3, 0.6, 2400, 10, 9), 10.3, 0.5)
amb.add(birds(2.3, 1.0, 9), 8.95, 0.7)
music.add(church_bell(196, 4.0), 11.3, 0.55, pan=-0.2)
music.add(organ([50, 57, 62, 65], 2.1), 11.2, 0.6)
sfx.add(shimmer(1.05, 0.9, 1400, 30, 11, up=True), 12.25, 0.6)
sfx.add(riser(0.9, 0.8, 300, 2), 12.55, 0.4)
amb.add(birds(2.2, 1.0, 10), 11.15, 0.6)
# C. "But he's hidden all around you": the examples
music.add(kick(48, 1.0), 13.5, 0.7); music.add(crash(2.5, 0.7), 13.5, 0.3)
for i in range(6): sfx.add(whoosh(0.35, True, 0.6, 400, 6000), 13.55 + i * 0.06, 0.18, pan=-0.6 + 0.24 * i)
sfx.add(shimmer(0.8, 0.7, 2000, 16, 12), 13.7, 0.4)
music.add(strings([62, 65, 69, 74], 1.6, 0.28, 2400, 0.1, 0.4), 13.5, 1.0)
groove(15.10, 26.0, [FM, CM, DM, BB], 4, 1.0, kick_on=True, clap=True, bells=True)
amb.add(birds(2.9, 1.0, 13), 15.1, 0.6)
sfx.add(poof(1.0, 14), 16.85, 0.55); sfx.add(whoosh(0.4, False, 0.8, 200, 3000), 17.08, 0.4)
sfx.add(thud(1.0, 65), 17.49, 0.75); sfx.add(thud(0.4, 90), 17.62, 0.3)
sfx.add(poof(1.0, 15), 18.33, 0.6); sfx.add(shimmer(0.5, 0.8, 1500, 14, 16), 18.4, 0.5)
for i in range(8): sfx.add(poof(0.5, 20 + i)[:int(0.5 * SR)] * 0.6 + np.pad(clack(0.3, 1800 + 150 * i), (0, int(0.5 * SR) - int(0.05 * SR))), 19.25 + i * 0.05, 0.5, pan=-0.3 + 0.08 * i)
sfx.add(jingle(1.0), 19.7, 0.4, pan=0.15)
sfx.add(shimmer(0.85, 1.0, 1200, 34, 17, up=True), 20.6, 0.65)
music.add(choir([62, 66, 69], 1.6, 'a', 0.6, 0.4, 0.6), 20.75, 0.5)
for i in range(13): sfx.add(step(0.6, 1800), 22.3 + i * 0.3 * 0.6, 0.35, pan=0.1)
sfx.add(whoosh(0.5, True, 0.7, 300, 5000), 22.25, 0.3)
for i in range(4): sfx.add(step(0.7, 3000) + np.pad(clack(0.25, 3200), (0, int(0.12 * SR) - int(0.05 * SR))), 24.6 + i * 0.45, 0.35, pan=-0.1)
# the monk: an organ chord and the sung hexachord: ut re mi fa sol la = C D E F G A
music.add(organ([48, 55, 60, 64], 3.6), 26.0, 0.55)
for i, (tt, m) in enumerate(zip([26.38, 26.68, 26.98, 27.25, 27.5, 27.75], [60, 62, 64, 65, 67, 69])):
    music.add(voice(m, 0.32 if i < 5 else 0.9, 'a', 1.0), tt, 0.55, pan=0.0)
    music.add(bell(midi(m + 24), 1.2, 0.35, 0.5), tt, 0.25, pan=0.25)
music.add(choir([57, 60, 64, 69], 1.9, 'o', 0.7, 0.4, 0.8), 27.8, 0.5)
# hospital and Harvard: warm strings, then the caps fly
music.add(strings([53, 60, 65, 69], 3.1, 0.3, 1800, 0.5, 0.6), 29.55, 1.0)
music.add(strings([48, 55, 64, 67], 2.7, 0.3, 2000, 0.3, 0.6), 32.6, 1.0)
groove(29.55, 35.2, [FM, CM], 4, 0.75, kick_on=True, clap=False, bells=False)
music.add(swell(0.9, 1.0), 33.0, 0.45); music.add(crash(2.5, 0.8), 33.88, 0.35)
for i in range(4): sfx.add(whoosh(0.45, True, 0.6, 500, 7000), 33.85 + i * 0.03, 0.25, pan=-0.4 + 0.27 * i)
for i, m in enumerate([72, 76, 79, 84]): music.add(bell(midi(m), 1.3, 0.6), 33.9 + i * 0.09, 0.35, pan=0.2)
amb.add(birds(5.6, 1.0, 14), 29.6, 0.25)
# D. "So how did one life change so much?": a held breath
music.add(choir([50, 57, 62], 2.4, 'u', 0.8, 0.5, 0.5), 35.2, 0.55)
music.add(strings([38, 45], 2.4, 0.4, 600, 0.4, 0.4), 35.2, 1.0)
amb.add(crickets(2.25, 1.0, 7), 35.2, 0.8)
sfx.add(riser(2.0, 1.0, 150, 3), 35.45, 0.45); sfx.add(whoosh(1.6, True, 0.8, 100, 3000), 35.8, 0.4)
# E. the spread along the Roman roads: a build to AD 380
music.add(boom(1.0, 2.0), 37.45, 0.6)
t = 37.45; k = 0
prog = [DM, BB, FM, CM, DM, BB, CM]
while t < 42.8:
    ch = prog[min(len(prog) - 1, int((t - 37.45) / 0.8))]
    acc = 1 + 0.35 * (t - 37.45) / 5.35
    music.add(timpani(midi(ch[0] - 12) if k % 4 == 0 else midi(ch[0] - 5), 0.6 * acc, 0.8), t, 0.45)
    for e in range(4):
        music.add(pluck(midi([ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12][e]), 0.3, 0.5, 0.6), t + e * B / 4, 0.32 * acc, pan=-0.3 + 0.2 * e)
    if k % 2 == 0: music.add(strings([m + 12 for m in ch[1:]], B * 2 + 0.2, 0.22 * acc, 1500 + 400 * acc, 0.15, 0.3), t, 1.0)
    t += B; k += 1
music.add(choir([62, 65, 69, 74], 5.0, 'a', 0.5, 2.5, 0.4), 37.8, 0.5)
music.add(swell(1.4, 1.0), 41.45, 0.3)
for i in range(40): sfx.add(bell(1500 * 2 ** (i / 40 * 1.5), 0.8, 0.25, 0.5), 37.8 + i * 0.125, 0.28, pan=np.sin(i) * 0.6)
# AD 380: the big hit, a bright D major
music.add(boom(1.2, 3.0), 42.8, 0.4); music.add(crash(3.0, 1.0), 42.8, 0.32); music.add(timpani(73.4, 1.2, 2.0), 42.8, 0.42)
music.add(choir([62, 66, 69, 74, 78], 2.2, 'a', 1.0, 0.08, 0.8), 42.8, 0.42)
music.add(strings([50, 57, 62, 66, 69], 2.2, 0.4, 2600, 0.05, 0.8), 42.8, 0.6)
for i, m in enumerate([74, 78, 81, 86]): music.add(bell(midi(m), 1.6, 0.7), 42.85 + i * 0.1, 0.4, pan=-0.3 + 0.2 * i)
# F. the old gods: storm
music.add(strings([38, 45, 50], 3.1, 0.5, 700, 0.3, 0.5), 44.95, 1.0)
music.add(choir([50, 53, 57], 3.0, 'o', 0.45, 0.6, 0.6), 44.95, 0.4)
amb.add(lp(rain(3.1), 7000), 44.95, 0.22)
amb.add(thunder(2.0, 0.5, 9), 45.0, 0.5)
sfx.add(thunder(1.6, 1.0, 10, 1.0, 0.7, 2.6), 46.82, 0.42, pan=-0.3); sfx.add(thunder(1.4, 1.0, 11, 1.0, 0.7, 3.0), 47.42, 0.4, pan=0.3)
music.add(timpani(55, 1.0, 1.4), 46.82, 0.4); music.add(timpani(55, 1.0, 1.4), 47.42, 0.4)
# G. the globe: wide and bright
music.add(boom(0.7, 1.5), 48.0, 0.35)
music.add(strings([53, 57, 60, 65], 2.5, 0.3, 2400, 0.4, 0.4), 48.0, 1.0)
music.add(strings([48, 55, 60, 64], 2.5, 0.3, 2400, 0.4, 0.6), 50.45, 1.0)
music.add(choir([60, 64, 67, 72], 2.6, 'a', 0.5, 0.6, 0.6), 50.4, 0.45)
groove(48.0, 52.95, [FM, CM], 4, 0.7, kick_on=True, clap=False, bells=False)
for i in range(30): sfx.add(bell(2200 * 2 ** ((i * 7 % 12) / 12), 0.6, 0.25, 0.4), 48.45 + i * 0.065, 0.22, pan=np.sin(i * 1.7) * 0.7)
for i in range(24): sfx.add(bell(1800 * 2 ** ((i * 5 % 12) / 12), 0.6, 0.25, 0.4), 50.95 + i * 0.06, 0.2, pan=np.cos(i * 1.3) * 0.7)
music.add(kick(50, 1.0), 50.95, 0.5); music.add(crash(1.6, 0.6), 50.95, 0.25)
# H. the board again: a ticking clock
for i in range(int(3.0 / (B / 2))): sfx.add(tick(1.0), 52.95 + i * B / 2, 0.35 if i % 2 == 0 else 0.22)
music.add(strings([50, 57, 62, 65], 3.0, 0.32, 1200, 0.5, 0.3), 52.95, 1.0)
for i, a in enumerate([0, 7, 5, 3]):
    for s in range(a): sfx.add(clack(0.55, 2300 + 120 * s), 55.05 + i * 0.07 + s * 0.075, 0.42, pan=-0.3 + 0.2 * i)
music.add(swell(0.6, 1.0), 55.0, 0.4); music.add(kick(45, 1.0), 55.6, 0.6)
amb.add(birds(3.0, 1.0, 21), 52.95, 0.5)
# I. the star shines again
amb.add(crickets(2.6, 1.0, 22), 55.95, 0.9)
sfx.add(swell(0.4, 1.0), 55.95, 0.4)
music.add(boom(0.9, 2.5), 56.33, 0.38)
sfx.add(shimmer(1.2, 1.2, 1500, 40, 23, up=True), 56.3, 0.34)
music.add(choir([62, 66, 69, 74, 78], 2.3, 'a', 1.0, 0.25, 1.0), 56.3, 0.5)
music.add(strings([50, 57, 62, 66, 69, 74], 2.3, 0.4, 3000, 0.2, 1.0), 56.3, 0.7)
for i, m in enumerate([74, 78, 81, 86, 90]): music.add(bell(midi(m), 2.0, 0.7), 56.35 + i * 0.12, 0.35, pan=-0.4 + 0.2 * i)

# ---------------- reverb (synthetic hall) ----------------
def reverb(L, R, secs=2.4, wet=0.3, seed=1):
    r = np.random.default_rng(seed); n = int(secs * SR); t = T(n)
    irs = []
    for k in range(2):
        ir = r.standard_normal(n) * np.exp(-t / (secs / 6.9))
        ir = lp(ir, 5000) * (1 - t / secs) ** 0.5; ir[:int(0.012 * SR)] = 0; irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return L + wet * signal.fftconvolve(L, irs[0])[:N], R + wet * signal.fftconvolve(R, irs[1])[:N]
mL, mR = reverb(hp(music.L, 45), hp(music.R, 45), 2.6, 0.45, 1)
sL, sR = reverb(hp(sfx.L, 35), hp(sfx.R, 35), 1.6, 0.25, 2)

# ---------------- voice + mix ----------------
vo, vsr = sf.read('audio/vo.wav')
if vo.ndim > 1: vo = vo.mean(1)
vo = signal.resample_poly(vo, SR, vsr) if vsr != SR else vo
vo = hp(vo, 80)
e = lp(np.abs(signal.hilbert(vo)), 20); gain = np.where(e > 0.12, (0.12 / np.maximum(e, 1e-6)) ** 0.35, 1.0); vo = vo * gain
vo = vo / (np.max(np.abs(vo)) + 1e-9) * 0.9
V = np.zeros(N); V[:min(N, len(vo))] = vo[:N]
venv = lp(np.abs(V), 5); talk = np.clip(venv / 0.04, 0, 1); duck = 1 - 0.62 * talk; sduck = 1 - 0.4 * talk
L = V + mL * 0.30 * duck + sL * 0.55 * sduck + amb.L * 0.35
R = V + mR * 0.30 * duck + sR * 0.55 * sduck + amb.R * 0.35
fade = np.ones(N); i0 = int(57.75 * SR); fade[i0:] = np.clip(1 - (np.arange(N - i0) / SR) / 0.55, 0, 1)
out = np.stack([L * fade, R * fade], 1)
out = out / (np.max(np.abs(out)) + 1e-9) * 0.89
sf.write('audio/mix.wav', out.astype(np.float32), SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
# how far the voice sits above everything else, in each second that has speech
bg = (mL * 0.30 * duck + sL * 0.55 * sduck + amb.L * 0.35)
on = talk > 0.5
Vb, bgb = hp(V, 200), hp(bg, 200)   # the speech band
ratios = [(rms(Vb[i:i + SR][on[i:i + SR]]) - rms(bgb[i:i + SR][on[i:i + SR]]), i / SR) for i in range(0, N - SR, SR) if on[i:i + SR].sum() > SR * 0.2]
worst = sorted(ratios)[:4]
print('voice above background per second: median %.1f dB, worst %s' % (np.median([r for r, _ in ratios]), ', '.join('%.1f dB at %ds' % w for w in worst)))
low = lp(L, 120); print('energy below 120 Hz: %.1f dB relative to the whole mix' % (rms(low) - rms(L)))
print(f'mix: {N / SR:.2f}s  voice rms {rms(V):.1f} dB  music rms {rms(mL * 0.3):.1f} dB  sfx rms {rms(sL * 0.55):.1f} dB')
