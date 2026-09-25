#!/usr/bin/env python3
"""Trilha do reel órbita — 128 BPM, 8 compassos = 15 s, sintetizada do zero.

Cada evento sonoro está preso a um evento visual do reel.html (mesmos tempos,
mesmas curvas). Uso:  python3 soundtrack.py saida.wav
"""
import sys
import wave
import numpy as np
from scipy import signal
from synth import (SR, Mix, n_of, tt, midi, env, ar, sine, saw, noise, pink, filt, sweep, logline,
                   fm_bell, pluck, supersaw, reverb_ir)

BPM, DUR = 128, 15.0
BEAT = 60 / BPM
B = lambda n: n * BEAT
M = Mix(DUR)


# ---- as mesmas cubic-bezier do JS, para cues que dependem de geometria ----
def bezier(p1x, p1y, p2x, p2y):
    def f(x):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            m = (lo + hi) / 2
            bx = 3 * p1x * m * (1 - m) ** 2 + 3 * p2x * m * m * (1 - m) + m ** 3
            lo, hi = (m, hi) if bx < x else (lo, m)
        m = (lo + hi) / 2
        return 3 * p1y * m * (1 - m) ** 2 + 3 * p2y * m * m * (1 - m) + m ** 3
    return f


EIO = bezier(0.6, 0.02, 0.16, 1)


def inv(f, y):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if f(m) < y else (lo, m)
    return lo


# ================= instrumentos =================
def kick(f0=160, f1=45, ad=0.34, click=0.5):
    n = n_of(ad * 2.2)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    body = np.tanh(1.7 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / ad))
    cl = filt(noise(n), 'hp', 2500) * np.exp(-t / 0.0025) * click
    return body + cl


def clap():
    n = n_of(0.35)
    t = tt(n)
    e = sum(np.exp(-np.clip(t - d, 0, None) / 0.006) * (t >= d) for d in (0, 0.009, 0.018))
    e = e + 0.55 * np.exp(-np.clip(t - 0.024, 0, None) / 0.085) * (t >= 0.024)
    return filt(filt(noise(n), 'bp', 1300, 0.9), 'hp', 600) * e * 1.6


def snare(f=190, dec=0.12):
    n = n_of(0.3)
    t = tt(n)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.05) * 0.6 + filt(noise(n), 'bp', 2400, 0.7) * np.exp(-t / dec)


def hat(open_=False):
    n = n_of(0.3 if open_ else 0.06)
    t = tt(n)
    return filt(filt(noise(n), 'hp', 7500), 'peak', 10000, 1, 4) * np.exp(-t / (0.11 if open_ else 0.018))


def click(f=2600, d=0.012):
    n = n_of(d)
    t = tt(n)
    return (filt(noise(n), 'bp', f, 1.5) + np.sin(2 * np.pi * f * t) * 0.6) * np.exp(-t / (d / 4))


def thock(f=150):
    n = n_of(0.25)
    t = tt(n)
    fr = f * (1 + 0.6 * np.exp(-t / 0.012))
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.07)
    c = click(3200, 0.01)
    body[:len(c)] += c * 0.5
    return body


def whoosh(d, f0, f1, q=0.9, peak=0.7, color='white'):
    n = n_of(d)
    x = pink(n) if color == 'pink' else noise(n)
    y = sweep(x, 'bp', logline(f0, f1, n), q)
    u = np.linspace(0, 1, n)
    e = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)
    return y * e


def zipper(d=0.2, f0=2600, f1=220):
    n = n_of(d)
    y = saw(logline(f0, f1, n, 0.7), n) * env(n, 0.002, d / 3)
    return filt(y, 'lp', 5000)


def sub(freq, d, a=0.01, r=0.06, drive=1.3):
    n = n_of(d)
    return np.tanh(drive * sine(freq, n)) * ar(n, a, r, 1.0)


def boom(f0=70, f1=32, d=1.6, dec=0.55):
    n = n_of(d)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / dec)


def crash(d=1.8, dec=0.7):
    n = n_of(d)
    t = tt(n)
    return filt(noise(n), 'hp', 2800) * np.exp(-t / dec) * ar(n, 0.002, 0.3, 1)


def riser(d, f0=180, f1=1400, g=1.0):
    n = n_of(d)
    u = np.linspace(0, 1, n)
    x = sweep(noise(n), 'bp', logline(500, 9000, n, 1.6), 0.8) * u ** 2.2
    s = saw(logline(f0, f1, n, 1.5), n) * u ** 2.6 * 0.25
    return (x + filt(s, 'lp', 4000)) * g * ar(n, 0.01, 0.01, 1)


def reverse_swell(d=0.5):
    y = crash(d, d / 2.5)[::-1]
    return y * ar(len(y), 0.01, 0.004, 1)


def blip_down(f0=1400, f1=260, d=0.09):
    n = n_of(d)
    return sine(logline(f0, f1, n), n) * env(n, 0.001, d / 3)


def ratchet(t0, t1, rate0, rate1, gain, pan=0.0, f=4200):
    t = t0
    while t < t1:
        u = (t - t0) / max(t1 - t0, 1e-6)
        M.add(click(f, 0.006), t, gain * (0.6 + 0.4 * u), pan)
        t += 1 / (rate0 + (rate1 - rate0) * u)


def pad(chord, t0, d, gain, cut0, cut1, bus='pump', send=0.25, a=0.25, r=0.4):
    n = n_of(d)
    y = supersaw([midi(m) for m in chord], d)
    y = sweep(y, 'lp', logline(cut0, cut1, n), 0.8) * ar(n, a, r, 1.4)
    M.add(y, t0, gain * 0.8, -0.25, bus, send)
    y2 = supersaw([midi(m) for m in chord], d)
    y2 = sweep(y2, 'lp', logline(cut0, cut1, n), 0.8) * ar(n, a, r, 1.4)
    M.add(y2, t0, gain * 0.8, 0.25, bus, send)


# ================= compasso 1 · IGNIÇÃO =================
M.add(boom(64, 38, 1.8, 0.7), 0.0, 0.350, 0, 'dry', 0.25)
M.add(fm_bell(midi(93), 2.0, 3.01, 1.2, 0.8), 0.0, 0.07, 0, 'dry', 0.8)
M.add(whoosh(0.45, 300, 5200, 1.0, 0.85), 0.03, 0.16)
M.add(sine(logline(260, 1100, n_of(0.44)), n_of(0.44)) * ar(n_of(0.44), 0.1, 0.05), 0.04, 0.035)
for i in range(26):                                     # marcas da régua, do centro para fora
    tk = 0.05 + (i / 25) * 0.34
    for side in ((-1, 1) if i else (0,)):
        major = i % 5 == 0
        M.add(click(5200 if major else 7000, 0.008), tk + 0.02, 0.09 if major else 0.045, side * (0.1 + 0.8 * i / 25))
M.add(whoosh(0.55, 2600, 420, 0.9, 0.55), 0.46, 0.2, np.linspace(-0.7, 0.7, n_of(0.55)))
for i, m in enumerate((69, 72, 76)):                   # a marca: três estouros = três notas
    tp = B(2) + i * 0.117
    M.add(pluck(midi(m), 1.2, 1.0, 0.35), tp, 0.34, (-0.15, 0.12, -0.02)[i], 'dry', 0.4)
    M.add(boom(120, 60, 0.3, 0.08), tp, 0.126)
M.add(reverse_swell(0.42), B(3) - 0.42, 0.1)
M.add(boom(80, 36, 1.2, 0.35), B(3), 0.280, 0, 'dry', 0.2)
M.add(crash(1.0, 0.25), B(3), 0.05, 0, 'dry', 0.3)
M.add(whoosh(0.4, 900, 7000, 1.1, 0.65), 1.48, 0.2, np.linspace(0, -0.85, n_of(0.4)))
pad([57, 64, 67, 71, 72], 0.0, B(8) - 0.03, 0.17, 320, 1900, 'dry', 0.4, 0.9, 0.06)   # Am9
M.add(sub(midi(33), B(8) - 1.0, 0.9, 0.05, 1.6), 1.0, 0.11)

# ================= compasso 2 · MANIFESTO =================
for k in range(16):                                     # tique-taque em semicolcheias
    M.add(hat(), B(4) + k * B(0.25), 0.04 if k % 2 else 0.06, 0.25 if k % 2 else -0.15)
for b in (4, 5, 6, 7):                                  # pulso de coração antes do drop
    M.add(kick(110, 45, 0.16, 0.2), B(b), 0.36)
for tw, f in ((B(4), 150), (B(4.5), 170), (B(5.5), 150)):
    M.add(thock(f), tw, 0.24, 0, 'dry', 0.1)
M.add(zipper(0.22), B(5), 0.13, np.linspace(-0.6, 0.6, n_of(0.22)))       # o risco na palavra
for i, m in enumerate((57, 60, 64, 67, 71)):            # "accountability." — acorde
    M.add(pluck(midi(m + 12), 1.4, 1.3, 0.4), B(6) + i * 0.012, 0.13, -0.4 + i * 0.2, 'dry', 0.45)
M.add(boom(90, 42, 0.8, 0.22), B(6), 0.245)
kk = 'Todos remando na mesma direção.'
for i, ch in enumerate(kk):                             # digitação da linha de apoio
    if ch != ' ':
        M.add(click(3800, 0.008), B(6.5) + i * 0.012 + (0.12 if i >= 17 else 0), 0.035, -0.3 + 0.6 * i / len(kk))
for k, tr in enumerate(np.concatenate([B(6) + np.arange(4) * B(0.5), B(7) + np.arange(4) * B(0.25), B(7.5) + np.arange(4) * B(0.125)])):
    M.add(snare(200 + k * 12), tr, 0.03 + 0.012 * k, 0, 'dry', 0.1)
M.add(riser(0.68, 160, 1500, 1.0), B(8) - 0.73, 0.3)
spin = n_of(0.34)
M.add(whoosh(0.34, 500, 3200, 0.9, 0.8) * (0.7 + 0.3 * np.sin(np.linspace(0, 18, spin))), B(8) - 0.36, 0.2,
      0.8 * np.sin(np.linspace(0, 14, spin)))

# ================= compassos 3–6 · o groove =================
KICKS = [b for b in range(8, 24) if b not in (15, 19)]
CHORD = {8: [53, 57, 60, 64, 67], 12: [55, 59, 62, 64, 69], 16: [57, 60, 64, 67, 71], 20: [53, 57, 60, 64, 67]}
ROOT = {8: 29, 12: 31, 16: 33, 20: 29}
for b in KICKS:
    M.add(kick(), B(b), 0.95, 0, 'drums')
for b in (9, 11, 13, 17, 21, 23):
    M.add(clap(), B(b), 0.44, 0.05, 'drums', 0.2)
for b in range(8, 24):
    if b in (15, 19):
        continue
    M.add(hat(True), B(b + 0.5), 0.13, 0.2, 'drums')
    for s in (0.25, 0.75):
        M.add(hat(), B(b + s), 0.05, -0.25, 'drums')
for bar0 in (8, 12, 16, 20):
    pad(CHORD[bar0], B(bar0), B(4) + 0.05, 0.16, 1500 if bar0 < 16 else 1900, 2600 if bar0 == 12 else 2100, 'pump', 0.2, 0.02, 0.05)
    for e in range(8):                                  # baixo em colcheias
        m = ROOT[bar0] + (12 if e % 2 else 0)
        bl = sub(midi(m + 12), B(0.5) * 0.92, 0.004, 0.03, 2.6) * 0.8 + sub(midi(m), B(0.5) * 0.92, 0.004, 0.03, 1.2) * 0.7
        bl = bl + filt(saw(midi(m + 24), len(bl)), 'lp', 900) * ar(len(bl), 0.004, 0.05) * 0.18
        M.add(bl, B(bar0 + e * 0.5), 0.27, 0, 'pump')
M.add(kick(170, 42, 0.5, 0.8), B(8), 0.6, 0, 'drums')     # o drop
M.add(boom(62, 30, 2.0, 0.6), B(8), 0.385)
M.add(crash(2.2, 0.8), B(8), 0.14, 0, 'dry', 0.35)
M.add(fm_bell(midi(77), 2.5, 3.5, 1.2, 1.4), B(8), 0.06, -0.3, 'dry', 0.7)
M.add(fm_bell(midi(84), 2.5, 3.5, 1.2, 1.4), B(8) + 0.02, 0.05, 0.3, 'dry', 0.7)
M.add(whoosh(1.0, 200, 2400, 0.8, 0.6, 'pink'), 3.86, 0.1, np.linspace(0.4, -0.4, n_of(1.0)))
PLANET = [72, 74, 77, 79, 81, 84]
PAN = [-0.2, 0.05, 0.25, 0.4, 0.55, 0.7]
for k in range(6):                                      # cada corpo tem sua nota
    tp = B(9) + k * B(0.5)
    M.add(pluck(midi(PLANET[k]), 1.0, 1.1, 0.3), tp, 0.26, PAN[k], 'dry', 0.4)
    M.add(blip_down(260, 120, 0.05), tp, 0.12, PAN[k])
M.add(whoosh(0.5, 1200, 300, 0.8, 0.5), 6.2, 0.09, 0.3)          # freio dos planetas
AL = B(14)
M.add(sine(logline(500, 3400, n_of(0.14)), n_of(0.14)) * env(n_of(0.14), 0.005, 0.08), AL - 0.1, 0.1, 0.4)
for k in range(6):                                      # alinhados: as seis notas em arpejo
    M.add(fm_bell(midi(PLANET[k] + 12), 1.4, 2.0, 1.0, 0.7), AL + k * 0.035, 0.06, PAN[k], 'dry', 0.6)
M.add(riser(0.9, 120, 900, 1.0), 6.62, 0.2)
M.add(whoosh(0.88, 180, 7000, 0.7, 0.92), 6.62, 0.5, np.linspace(0.3, -0.3, n_of(0.88)))
for k, kk_ in ((4, 0), (2, 0), (5, 1), (1, 1), (0, 2)):   # vizinhos saem de cena
    to = 6.74 + kk_ * 0.07 + 0.2
    M.add(blip_down(1500, 300, 0.1), to, 0.1, PAN[k])
for i, tr in enumerate(B(15) + np.arange(8) * B(0.125)):
    M.add(snare(210 + i * 10, 0.08), tr, 0.05 + 0.025 * i, 0, 'drums', 0.1)

# ================= compasso 5 · VARREDURA =================
T5 = B(16)
M.add(boom(90, 38, 1.2, 0.35), T5, 0.315)
M.add(crash(1.2, 0.4), T5, 0.07, 0, 'dry', 0.3)
M.add(click(1800, 0.03), T5, 0.25, -0.2)
ratchet(T5 + 0.06, T5 + 0.6, 90, 40, 0.025, 0.3, 6000)            # mostrador girando
ns = n_of(0.8)
sc = sine(logline(2400, 900, ns), ns) * (0.6 + 0.4 * np.sin(2 * np.pi * 34 * tt(ns))) * ar(ns, 0.04, 0.1)
M.add(sc, T5 + 0.12, 0.05)
M.add(whoosh(0.8, 5000, 900, 1.2, 0.5), T5 + 0.12, 0.05)
for y, m in ((0.244, 88), (0.326, 91), (0.674, 93), (0.756, 96)):  # nós: acendem quando a linha passa
    th = T5 + 0.12 + 0.78 * inv(EIO, y)
    M.add(pluck(midi(m), 0.6, 1.4, 0.12), th, 0.13, -0.35 + y * 0.7, 'dry', 0.3)
    M.add(click(5200, 0.01), th + 0.22, 0.06, 0.2)
    M.add(click(6200, 0.01), th + 0.26, 0.05, 0.2)
M.add(whoosh(0.35, 400, 2600, 1.0, 0.6), T5 + 0.1, 0.08, 0.4)
for i in range(3):                                      # contadores dos KPIs
    ratchet(T5 + 0.3 + i * 0.07, T5 + 0.3 + i * 0.07 + 0.55, 60, 14, 0.028, 0.2 + i * 0.2)
M.add(whoosh(0.3, 3000, 500, 1.0, 0.4), B(18) + 0.18, 0.06)

# CRT: tudo desliga no fio de varredura (tape stop na música)
TS0, TSD = B(19) + 0.02, 0.26
pd = n_of(0.34)
M.add(sine(logline(1400, 38, pd, 0.6), pd) * env(pd, 0.002, 0.12) + filt(noise(pd), 'bp', 900, 0.6) * env(pd, 0.001, 0.03), TS0, 0.2)
M.add(sine(3100, n_of(0.3)) * ar(n_of(0.3), 0.02, 0.2), TS0 + 0.05, 0.02)

# ================= compasso 6 · IMPULSO =================
M.add(whoosh(0.24, 4500, 260, 1.0, 0.8), B(19) + 0.18, 0.2)
M.add(boom(110, 50, 0.4, 0.12), B(19) + 0.42, 0.210)
M.add(click(2200, 0.02), B(20), 0.12)
M.add(whoosh(0.3, 600, 3000, 1.0, 0.5), B(20), 0.1, 0.2)
ratchet(B(21) - 0.38, B(21) - 0.02, 70, 22, 0.045, -0.3)          # odômetro
for i, m in enumerate((53, 57, 60, 64, 67, 72)):        # −87,5% aterrissa: acorde
    M.add(pluck(midi(m + 12), 1.6, 1.4, 0.45), B(21) + i * 0.008, 0.12, -0.5 + i * 0.2, 'dry', 0.4)
M.add(boom(80, 36, 1.0, 0.3), B(21), 0.280)
M.add(crash(0.8, 0.22), B(21), 0.05)
M.add(whoosh(0.25, 800, 4000, 1.0, 0.5), B(22) - 0.2, 0.08)
M.add(whoosh(0.3, 3000, 600, 0.9, 0.3), B(22), 0.12, -0.2)
for k in range(6):                                      # seis interruptores: as notas dos planetas
    tg = B(22) + 0.2 + k * B(0.125)
    M.add(pluck(midi(PLANET[k]), 0.8, 1.0, 0.25), tg, 0.22, -0.6 + k * 0.24, 'dry', 0.35)
    M.add(click(3000, 0.01), tg, 0.08, -0.6 + k * 0.24)

# ================= compasso 7 · HORIZONTE (breakdown) =================
M.add(boom(55, 30, 2.4, 0.9), B(24), 0.245, 0, 'dry', 0.2)
M.add(whoosh(0.6, 2200, 300, 0.7, 0.4, 'pink'), 11.3, 0.12)
pad([53, 57, 60, 64, 67], B(24), B(2) + 0.1, 0.23, 900, 4200, 'dry', 0.5, 0.2, 0.2)       # Fmaj9
pad([55, 60, 62, 67, 69], B(26), B(2) - 0.02, 0.25, 3000, 7000, 'dry', 0.5, 0.15, 0.08)  # Gsus
M.add(sub(midi(29), B(2), 0.3, 0.1, 2.2), B(24), 0.22)
M.add(sub(midi(31), B(2) - 0.05, 0.1, 0.05, 2.2), B(26), 0.22)
ARP = [65, 69, 72, 76, 77, 76, 72, 69, 67, 71, 74, 79, 81, 79, 74, 71]
for i in range(22):
    ta = B(25) + i * B(0.25)
    if ta > B(28) - 0.08:
        break
    M.add(pluck(midi(ARP[i % 16] + 12), 0.5, 0.8, 0.18), ta, 0.07 + 0.03 * i / 22, 0.5 * np.sin(i * 1.3), 'dry', 0.55)
for tl in (B(25) - 0.1, B(26) - 0.14):
    M.add(whoosh(0.35, 700, 2400, 0.8, 0.4, 'pink'), tl, 0.05)
for i, m in enumerate((84, 88, 91)):                    # nascer do sol
    M.add(fm_bell(midi(m), 2.6, 3.5, 1.3, 1.6), B(27) + i * 0.02, 0.07, (-0.3, 0, 0.3)[i], 'dry', 0.7)
M.add(riser(0.8, 200, 1800, 1.0), B(28) - 0.84, 0.26)
M.add(reverse_swell(0.5), B(28) - 0.52, 0.12)

# ================= compasso 8 · ASSINATURA =================
TE = B(28)
M.add(kick(170, 40, 0.6, 0.9), TE, 0.9, 0, 'drums')
M.add(boom(70, 28, 2.2, 0.8), TE, 0.420)
M.add(crash(2.4, 0.9), TE, 0.16, 0, 'dry', 0.4)
pad([48, 55, 60, 62, 64, 67], TE, 15.0 - TE, 0.22, 3600, 1600, 'dry', 0.5, 0.01, 0.3)      # Cadd9
M.add(sub(midi(24), 15.0 - TE, 0.01, 0.35, 2.0), TE, 0.24)
M.add(whoosh(0.5, 700, 5200, 1.0, 0.6), TE, 0.2, np.linspace(-0.85, 0, n_of(0.5)))
for i in range(6):
    M.add(click(4400, 0.008), TE + 0.36 + i * 0.04, 0.04, -0.3 + i * 0.12)
M.add(whoosh(0.45, 5000, 9000, 1.2, 0.5), 13.72, 0.03)
for i in range(46):
    if i % 3 == 0:
        M.add(click(5000, 0.006), 13.8 + i * 0.006, 0.02, -0.4 + 0.8 * i / 46)
for i, m in enumerate((72, 76, 79)):                    # a marca pulsa: três notas, agora em maior
    M.add(pluck(midi(m), 1.2, 1.1, 0.5), B(31) + i * 0.06, 0.26, (-0.2, 0.1, 0.25)[i], 'dry', 0.5)
    M.add(fm_bell(midi(m + 12), 1.0, 3.5, 0.9, 0.6), B(31) + i * 0.06, 0.05, 0, 'dry', 0.6)

# ================= mixagem =================
kt = np.array([B(b) for b in KICKS + [28]])
t = tt(M.N)
duck = np.ones(M.N)
for k in kt:
    m = t >= k
    duck[m] = np.minimum(duck[m], 1 - 0.68 * np.exp(-(t[m] - k) / 0.11))
music = M.bus['pump'] * duck + M.bus['drums']


def tape_stop(x, t0, d):
    """desacelera como fita até parar; depois silêncio até a volta do beat"""
    i0, n = int(t0 * SR), n_of(d)
    u = np.arange(n) / n
    rate = (1 - u) ** 1.25
    pos = i0 + np.cumsum(rate)
    y = x.copy()
    for c in range(2):
        y[c, i0:i0 + n] = np.interp(pos, np.arange(x.shape[1]), x[c]) * (1 - u ** 3)
    y[:, i0 + n:int((B(20) - 0.004) * SR)] = 0
    return y


music = tape_stop(music, TS0, TSD)
irL, irR = reverb_ir(2.4)
v = M.bus['verb']
wet = np.vstack([signal.fftconvolve(v[0], irL)[:M.N], signal.fftconvolve(v[1], irR)[:M.N]])
# ganho por seção: a introdução e o breakdown sobem um pouco, sem roubar o drop
sec = 1 + 0.38 * (1 - np.clip((t - 3.6) / 0.12, 0, 1)) + 0.3 * np.clip((t - 11.3) / 0.2, 0, 1) * (1 - np.clip((t - 12.95) / 0.15, 0, 1))
mix = M.bus['dry'] * sec + music + wet * 0.5 * sec
mix = np.vstack([filt(mix[0], 'hp', 24), filt(mix[1], 'hp', 24)])
mix /= np.max(np.abs(mix)) + 1e-9


def lufs(x):
    """loudness integrada BS.1770 (ponderação K, blocos de 400 ms, gates)"""
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]
    k = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=1), axis=1)
    blk, hop = n_of(0.4), n_of(0.1)
    ms = np.array([np.sum(np.mean(k[:, i:i + blk] ** 2, axis=1)) for i in range(0, k.shape[1] - blk, hop)])
    ld = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[ld > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    return -0.691 + 10 * np.log10(np.mean(ms[(ld > -70) & (ld > rel)]))


def limiter(x, ceil=0.84, look=0.003, rel=0.09):
    """limitador com antecipação: o ganho desce antes do pico e volta devagar"""
    from scipy.ndimage import maximum_filter1d
    L = n_of(look)
    pk = maximum_filter1d(np.abs(x).max(0), size=2 * L + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    a = np.exp(-1 / (rel * SR))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]
        out[i] = cur
    return x * out


for _ in range(3):                                      # mira −14 LUFS com teto de −1 dBFS
    mix = mix * 10 ** ((-14.0 - lufs(mix)) / 20)
    mix = limiter(mix)
fade = np.ones(M.N)
fi = t >= 14.72
fade[fi] = np.cos(np.clip((t[fi] - 14.72) / 0.28, 0, 1) * np.pi / 2) ** 2
fade[:n_of(0.004)] = np.linspace(0, 1, n_of(0.004))
mix = mix * fade
print('LUFS', round(lufs(mix), 2))

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
pcm = np.clip(np.round(mix.T * 8388607), -8388608, 8388607).astype(np.int32)
b = (pcm.reshape(-1, 1).view(np.uint8).reshape(-1, 4)[:, :3]).tobytes()
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(b)
print('wrote', out, f'{M.N / SR:.3f}s', 'peak', float(np.max(np.abs(mix))))
