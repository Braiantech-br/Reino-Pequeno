# Trailer 2.1 soundtrack ("o Claude comanda o Reino Vermelho"): epic-electronic at 128 BPM, cut to the shots,
# with a "machine thinking" intro of data bleeps (all synthesized here).
import numpy as np, sys
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
SR = 44100; BPM = 128; BEAT = 60 / BPM
TOTAL_BEATS = 108; TAIL = 2.5
N = int((TOTAL_BEATS * BEAT + TAIL) * SR)
L = np.zeros(N); Rr = np.zeros(N)
rng = np.random.default_rng(21)
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

# ---------------------------------------------------------------- the score
CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]   # Am F C G
def chord_at(b): return CH[int(b // 4) % 4]
duck = np.ones(N)
def sidechain(b):
    i = at(b); n = int(.22 * SR); j = min(N, i + n); duck[i:j] = np.minimum(duck[i:j], 1 - .75 * np.exp(-np.arange(j - i) / SR / .07))

def groove(b0, b1, lead=True, hats=True, oct=0, half=False, bright=2600):
    b = b0
    while b < b1 - 1e-6:
        if not half or (b - b0) % 2 == 0:
            add(kick(1.0), b); sidechain(b)
        if (not half and (b % 2 == 1)) or (half and (b - b0) % 4 == 2): add(snare(.85), b)
        if hats:
            for s in range(4): add(hat(.16 if s % 2 else .08), b + s / 4)
        root, tri = chord_at(b)
        for e in range(2):
            add(bass_note(root - 12, BEAT / 2 * .9, .55), b + e / 2)
        if lead:
            seq = [tri[0], tri[1], tri[2], tri[1] + 12 if (int(b) % 2) else tri[2] + 12]
            for s in range(4): add(lead_note(seq[s] + 12 + oct, BEAT / 4 * .95, .5, bright), b + s / 4, pan=(-.3 if s % 2 else .3))
        b += 1
def hit(b, g=1.0):
    add(boom(.9 * g), b); add(crash(.28 * g), b); add(kick(1.0 * g), b)

# intro (0-8): the war report goes to Claude. Drone, heartbeat, data bleeps while the terminal types,
# an alarm on "ORDEM: SAQUEAR", the slam "O INIMIGO PENSA." on beat 6, a roll into the drop.
add(pad([45, 52, 57], 8 * BEAT, .2, 600), 0)
for b in range(6): add(kick(.45 if b < 3 else .6), b)
PENTA = [81, 84, 86, 88, 91, 93, 96]
t = .06
while t < 2.7:                                   # seconds: the terminal types from 0 to 2.7 s
    add(bleep(PENTA[rng.integers(len(PENTA))], .05, .10 + .05 * rng.random()), t / BEAT, pan=rng.uniform(-.5, .5))
    t += rng.choice([.045, .06, .09, .12])
add(alarm(.35), 2.05 / BEAT)
add(riser(2.6, .35), 0.4)
hit(6, 1.1); add(whoosh(.5, .5), 5.0)
for k in range(8): add(snare(.25 + k * .08), 7 + k / 8)

# A (8-40): logo, ele lê a guerra, ele decide, ataca onde dói
hit(8, 1.25)
groove(8, 40)
for b in range(8, 40, 4): add(pad(chord_at(b)[1], 4 * BEAT, .22, 1400), b)
for b in [16, 24, 32]: hit(b, .75); add(whoosh(.45, .5), b - .9)
for b in np.arange(16, 24, .5):                  # the "thinking" arp over the report
    root, tri = chord_at(b); add(bleep(tri[int(b * 2) % 3] + 24, .06, .07), float(b), pan=.4 if int(b * 2) % 2 else -.4)
# flanco (40-46), recua (46-52)
groove(40, 52, oct=12, bright=3000)
for b in range(40, 52, 4): add(pad(chord_at(b)[1], 4 * BEAT, .22, 1500), b)
hit(40, .9); add(whoosh(.45, .5), 39.1)
hit(46, .8); add(whoosh(.9, .55, up=False), 46.3)
# cerco (52-60)
hit(52, 1.0)
groove(52, 60, oct=12, bright=3400)
for b in range(52, 60, 4): add(pad(chord_at(b)[1], 4 * BEAT, .24, 1700), b)
# provoca (60-68): breakdown, the taunt, a riser into "você"
hit(60, .7)
groove(60, 68, lead=False, hats=True, half=True)
for b in range(60, 68, 4): add(pad(chord_at(b)[1], 4 * BEAT, .2, 900), b)
for b in np.arange(60, 66, .5):
    root, tri = chord_at(b); add(lead_note(tri[int(b * 2) % 3] + 24, BEAT * .4, .07, 4000), float(b), pan=.4 if int(b * 2) % 2 else -.4)
add(riser(4 * BEAT, .55), 64)
for k in range(8): add(snare(.25 + k * .07), 66 + k / 4)
# você (68-76): the menu (click on Claude), then "VOCÊ AGUENTA?"
hit(68, .8)
groove(68, 72, lead=False, hats=True, half=True)
add(pad(chord_at(68)[1], 4 * BEAT, .22, 1200), 68)
add(click(.6), 68 + .8 / BEAT)
hit(72, 1.2)
groove(72, 76, oct=12, bright=3600)
add(pad(chord_at(72)[1], 4 * BEAT, .26, 2000), 72)
add(riser(2 * BEAT, .5), 74)
for k in range(8): add(snare(.2 + k * .06), 75 + k / 8)
# montage (76-92): a hit every 2 beats, the last one the biggest ("VENÇA O CLAUDE.")
groove(76, 92, oct=12, bright=4200)
for b in range(76, 92, 2): hit(b, .9 if b != 90 else 1.35)
for b in range(76, 92, 4): add(pad(chord_at(b)[1], 4 * BEAT, .28, 2200), b)
add(whoosh(.9, .7), 90.2)
# end (92-108): the big hit, the anthem chords, the final boom for Braian Tech (beat 103)
hit(92, 1.4)
prog = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 60, 64], [55, 62, 67, 71]]
for i, ch in enumerate(prog): add(pad(ch, 4 * BEAT + .3, .32, 2200), 92 + 4 * i)
for i, ch in enumerate(prog):
    for s in range(8): add(lead_note(ch[s % 4] + 12, BEAT * .45, .09, 3000), 92 + 4 * i + s / 2, pan=.35 if s % 2 else -.35)
for b in range(92, 102, 2): add(kick(.6), b)
hit(103, 1.5)
add(pad([45, 52, 57, 64], 5 * BEAT + TAIL, .3, 1400), 103)

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
