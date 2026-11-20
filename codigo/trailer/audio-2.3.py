# Update video 2.3 soundtrack: epic-electronic at 128 BPM cut to the shots (the same synthesized instruments as the 2.2
# trailer): a dark intro and the title slam, a bright drop for the Forja, a darker half-time for the dead and the giant,
# "thinking" bleeps under the war council's counter, a held breath before the ambush, and the anthem at the end.
import numpy as np, sys
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
SR = 44100; BPM = 128; BEAT = 60 / BPM
TOTAL_BEATS = 98; TAIL = 2.5
N = int((TOTAL_BEATS * BEAT + TAIL) * SR)
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(22)
def at(b): return int(b * BEAT * SR)
def env(n, a=0.002, d=0.3, shape=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d) ** shape
    return e
def add(sig, b, gain=1.0, pan=0.0):
    i = at(b)
    j = min(N, i + len(sig)); s = sig[:j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); Rr[i:j] += s * (1 + min(0, pan))
def lp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------------------------------------------------------- instruments
def kick(g=1.0):
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / .035); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, .001, .22) + .5 * np.exp(-t / .004) * rng.standard_normal(n) * .3
    return np.tanh(s * 1.6) * g
def snare(g=1.0):
    n = int(.3 * SR); t = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 900, 6000) * env(n, .001, .08) * .7 + np.sin(2 * np.pi * 185 * t) * env(n, .001, .06) * .8
    return np.tanh(s * 1.4) * g
def hat(g=1.0, d=.035):
    n = int(.15 * SR); return hp(rng.standard_normal(n), 7000) * env(n, .0005, d) * g
def crash(g=1.0):
    n = int(2.2 * SR); return hp(rng.standard_normal(n), 4000) * env(n, .001, .7) * g
def boom(g=1.0):
    n = int(2.0 * SR); t = np.arange(n) / SR
    f = 32 + 70 * np.exp(-t / .12); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, .002, .55) + lp(rng.standard_normal(n), 400) * env(n, .001, .25) * .8
    return np.tanh(s * 2.2) * g
def whoosh(dur, g=1.0, up=True):
    n = int(dur * SR); t = np.arange(n) / SR; x = rng.standard_normal(n)
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        k = i / n if up else 1 - i / n
        lo = 200 + 5000 * k ** 2; hi = lo * 2.2
        out[i:i + seg] = bp(x[i:i + seg], lo, min(hi, 18000))
    a = (t / dur) ** 2 if up else np.exp(-t / (dur * .4))
    return out * a * g
def riser(dur, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 200 * 2 ** (t / dur * 3); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * .25 + 0) * (t / dur) ** 2 * g + whoosh(dur, g * .9)
def saw(f, n, det=0.0):
    t = np.arange(n) / SR; s = np.zeros(n)
    for d in ([0] if det == 0 else [-det, 0, det]):
        ff = f * (1 + d); s += 2 * ((t * ff) % 1) - 1
    return s / (1 if det == 0 else 3)
def square(f, n):
    t = np.arange(n) / SR; return np.sign(np.sin(2 * np.pi * f * t))
def bass_note(m, dur, g=1.0):
    n = int(dur * SR); s = lp(saw(mtof(m), n, .004), 420) * env(n, .004, dur * .9) + np.sin(2 * np.pi * mtof(m) * np.arange(n) / SR) * .6 * env(n, .004, dur)
    return np.tanh(s * 1.5) * g
def lead_note(m, dur, g=1.0, bright=2600):
    n = int(dur * SR); s = lp(saw(mtof(m), n, .006) * .7 + square(mtof(m + 12), n) * .25, bright) * env(n, .003, dur * 1.1)
    return s * g
def pad(ms, dur, g=1.0, cut=1600):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(saw(mtof(m), n, .008) for m in ms) / len(ms)
    a = np.minimum(1, t / (dur * .25)) * np.minimum(1, (dur - t) / (dur * .3) + .0)
    return lp(s, cut) * np.clip(a, 0, 1) * g

def bleep(m, dur=.07, g=1.0):
    n = int(dur * SR); return lp(square(mtof(m), n), 6000) * env(n, .001, dur * .45) * g
def click(g=1.0):
    n = int(.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t / .006) + hp(rng.standard_normal(n), 3000) * np.exp(-t / .004) * .5) * g
def alarm(g=1.0):
    n = int(.9 * SR); t = np.arange(n) / SR
    s = square(mtof(45), n) * .5 + square(mtof(46), n) * .5
    return lp(s, 1800) * env(n, .005, .5) * g

def braam(m, dur=2.2, g=1.0):
    """the big brass-like hit of trailers: detuned saws, a filter that opens, distortion"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(saw(mtof(mm), n, .012) for mm in (m - 12, m, m + 7)) / 3
    k = np.clip(t / .35, 0, 1)
    s = lp(x, 380) * (1 - k) + lp(x, 2200) * k
    s = np.tanh(s * 3.2) * np.minimum(1, t / .025) * np.exp(-t / (dur * .45))
    return s * g
def subdrop(dur=1.6, g=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 28 + 70 * np.exp(-t / .35); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 1.8) * np.exp(-t / (dur * .5)) * g
def reese(m, dur, g=1.0):
    n = int(dur * SR); f = mtof(m)
    s = saw(f * .993, n) + saw(f * 1.007, n) + np.sin(2 * np.pi * f / 2 * np.arange(n) / SR) * .8
    return np.tanh(lp(s, 520) * 1.7) * env(n, .004, dur * .85) * g
def tom(f0, g=1.0):
    n = int(.35 * SR); t = np.arange(n) / SR
    f = f0 * (1 + .7 * np.exp(-t / .04)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 1.4) * np.exp(-t / .16) * g
def revswell(dur=1.0, g=1.0):
    x = crash(1.0)[:int(dur * SR)][::-1]; return x * g
def heartbeat(g=1.0):
    a = lp(kick(1.0), 160); n = len(a); out = np.zeros(n + int(.2 * SR)); out[:n] += a; out[int(.2 * SR):int(.2 * SR) + n] += a * .7
    return out * g
def tick(g=1.0):
    n = int(.03 * SR); return hp(rng.standard_normal(n), 5000) * np.exp(-np.arange(n) / SR / .004) * g

# ---------------------------------------------------------------- the score
CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]   # Am F C G
def chord_at(b): return CH[int(b // 4) % 4]
duck = np.ones(N)
def sidechain(b):
    i = at(b); n = int(.24 * SR); j = min(N, i + n); duck[i:j] = np.minimum(duck[i:j], 1 - .8 * np.exp(-np.arange(j - i) / SR / .075))
def groove(b0, b1, lead=True, hats=True, oct=0, half=False, bright=2600, bass='reese'):
    b = b0
    while b < b1 - 1e-6:
        if not half or (b - b0) % 2 == 0:
            add(kick(1.1), b); sidechain(b)
        if (not half and (b % 2 == 1)) or (half and (b - b0) % 4 == 2): add(snare(.95), b)
        if hats:
            for s in range(4): add(hat(.17 if s % 2 else .09), b + s / 4)
        root, tri = chord_at(b)
        for e in range(2):
            add(reese(root - 24, BEAT / 2 * .92, .62) if bass == 'reese' else bass_note(root - 12, BEAT / 2 * .9, .55), b + e / 2)
        if lead:
            seq = [tri[0], tri[1], tri[2], tri[1] + 12 if (int(b) % 2) else tri[2] + 12]
            for s in range(4): add(lead_note(seq[s] + 12 + oct, BEAT / 4 * .95, .48, bright), b + s / 4, pan=(-.3 if s % 2 else .3))
        b += 1
def hit(b, g=1.0, br=None):
    add(boom(.95 * g), b); add(crash(.3 * g), b); add(kick(1.1 * g), b); sidechain(b)
    if br is not None: add(braam(br, 2.0, .55 * g), b)

PENTA = [81, 84, 86, 88, 91, 93, 96]
# intro (0-8): dark pad, heartbeats, the title slam on beat 4, a riser into the drop
add(pad([33, 40, 45], 8 * BEAT, .2, 420), 0)
for b in [0, 1, 2, 3]: add(heartbeat(.6), b)
add(revswell(.9, .5), 4 - .9 / BEAT)
hit(4, 1.4, 45); add(subdrop(1.6, .8), 4)
add(riser(3 * BEAT, .5), 5)
for k in range(8): add(snare(.18 + k * .08), 7 + k / 8)
# forja (8-20): the drop; a bleep on every beat when an option of the hero changes
hit(8, 1.5, 45); add(subdrop(1.8, 1.0), 8)
groove(8, 20, oct=12, bright=3600)
for b in range(8, 20, 4): add(pad(chord_at(b)[1], 4 * BEAT, .24, 1800), b)
for b in range(10, 20): add(bleep(PENTA[b % len(PENTA)], .07, .12), b, pan=.4 if b % 2 else -.4)
# heroes and monsters (20-28): a hit every two beats
groove(20, 28, oct=12, bright=4000)
for b in range(20, 28, 2): hit(b, .85)
for b in range(20, 28, 4): add(pad(chord_at(b)[1], 4 * BEAT, .26, 2000), b)
# the necromancer (28-36): darker, half time, a braam
hit(28, 1.1, 40)
groove(28, 36, lead=False, half=True, bass='reese')
add(pad([40, 47, 52], 8 * BEAT, .24, 700), 28)
for b in [30, 32, 34]: add(braam(40, 1.4, .35), b)
# the giant (36-44): heavy hits and toms
for b in [36, 38, 40, 42]: hit(b, 1.1, 41); add(subdrop(1.0, .5), b)
for k in range(16): add(tom(80 + k * 3, .25 + k * .03), 36 + k / 2)
# the war council (44-52): half time and thinking bleeps; a riser to the ambush
groove(44, 52, lead=False, half=True, bass='soft')
for b in range(44, 52, 4): add(pad(chord_at(b)[1], 4 * BEAT, .24, 1200), b)
for b in np.arange(44, 51.5, .25):
    root, tri = chord_at(b); add(bleep(tri[int(b * 4) % 3] + 24 + (0 if int(b * 4) % 2 else 7), .04, .05), float(b), pan=-.6 if int(b * 4) % 2 else .6)
add(riser(2 * BEAT, .45), 50)
# the ambush (52-60): held breath in the woods (ticks, heartbeat), the strike on beat 56
for k in range(8): add(tick(.3 if k % 2 == 0 else .18), 52 + k / 2)
for b in [52, 53, 54, 55]: add(heartbeat(.7), b)
add(revswell(.8, .6), 56 - .8 / BEAT)
hit(56, 1.6, 41); add(subdrop(2.0, 1.0), 56)
groove(56, 60, oct=12, bright=3800)
# the pincer (60-68): the march, then the two arms close (hit on 63)
groove(60, 68, oct=12, bright=4200)
for k in range(12): add(tom(90 + k * 4, .25 + k * .03), 60 + k / 4)
hit(63, 1.2, 45)
for b in range(64, 68, 2): hit(b, .8)
for b in range(60, 68, 4): add(pad(chord_at(b)[1], 4 * BEAT, .28, 2200), b)
# warship (68-74), two players (74-80), lives (80-86)
hit(68, 1.0); groove(68, 86, oct=12, bright=4400)
hit(74, 1.0, 45)
for b in range(68, 86, 4): add(pad(chord_at(b)[1], 4 * BEAT, .28, 2300), b)
for b in np.arange(80, 86, .5):
    root, tri = chord_at(b); add(bleep(tri[int(b * 2) % 3] + 24, .05, .07), float(b), pan=.5 if int(b * 2) % 2 else -.5)
hit(80, 1.0)
add(riser(2 * BEAT, .5), 84)
for k in range(8): add(snare(.2 + k * .08), 85 + k / 8)
# end (86-98): the big hit, the anthem chords, the last boom
hit(86, 1.6, 45); add(subdrop(2.0, .9), 86)
prog = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 60, 64]]
for i, ch in enumerate(prog): add(pad(ch, 4 * BEAT + .3, .32, 2200), 86 + 4 * i)
for i, ch in enumerate(prog):
    for s in range(8): add(lead_note(ch[s % 4] + 12, BEAT * .45, .09, 3000), 86 + 4 * i + s / 2, pan=.35 if s % 2 else -.35)
for b in range(86, 94, 2): add(kick(.6), b)
hit(94, 1.5, 45)
add(pad([45, 52, 57, 64], 4 * BEAT + TAIL, .3, 1400), 94)

# ---------------------------------------------------------------- mix
mono_duck = duck
# the duck only on the music bus would need stems; a light global pump still gives the drive
L *= (0.65 + 0.35 * mono_duck); Rr *= (0.65 + 0.35 * mono_duck)
ir_n = int(1.6 * SR); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR / .45); ir = hp(ir, 300) * .0028
L = L + fftconvolve(L, ir)[:N]; Rr = Rr + fftconvolve(Rr, np.roll(ir, 113))[:N]
L = lp(L, 11000); Rr = lp(Rr, 11000)
mx = max(np.abs(L).max(), np.abs(Rr).max())
L = np.tanh(L / mx * 1.25) * .95; Rr = np.tanh(Rr / mx * 1.25) * .95
fade = int(1.0 * SR); L[-fade:] *= np.linspace(1, 0, fade); Rr[-fade:] *= np.linspace(1, 0, fade)
out = np.stack([L, Rr], 1)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'trilha.wav', SR, (out * 32767).astype(np.int16))
print('ok', round(N / SR, 2), 's')
