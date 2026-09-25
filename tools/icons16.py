"""16×16 power icons for dark tiles (ui/icons16.ts): paper/signal shapes, grey shading (light from the top-left),
ink details. '#' ink, 'y' signal, 'p' paper, 'g' grey, '.' empty. Run: python3 tools/icons16.py games/stay-rare/ui/icons16.ts"""
import math, sys
N = 16
def C(): return [['.'] * N for _ in range(N)]
def put(g, x, y, c):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < N and 0 <= y < N: g[y][x] = c
def disc(g, cx, cy, r, c):
    for y in range(N):
        for x in range(N):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.25: g[y][x] = c
def ell(g, cx, cy, rx, ry, c):
    for y in range(N):
        for x in range(N):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: g[y][x] = c
def line(g, x0, y0, x1, y1, c, w=1):
    n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
    for i in range(n + 1):
        t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
        for dx in range(w):
            for dy in range(w): put(g, x + dx - (w - 1) / 2, y + dy - (w - 1) / 2, c)
def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(g, x, y, c)
def arc(g, cx, cy, r, a0, a1, c, w=1):
    for k in range(0, 181):
        a = math.radians(a0 + (a1 - a0) * k / 180)
        for d in range(w): put(g, cx + math.cos(a) * (r - d), cy + math.sin(a) * (r - d), c)
def shade(g, fill='p', to='g'):
    """Grey the bottom-right rim of `fill` regions (light from the top-left)."""
    src = [r[:] for r in g]
    for y in range(N):
        for x in range(N):
            if src[y][x] == fill and ((y + 1 >= N or src[y + 1][x] != fill) or (x + 1 >= N or src[y][x + 1] != fill)): g[y][x] = to
    return g
I = {}

# 1 Bone Bolt: a bone flying up-right, knobs at both ends, signal speed dashes behind
g = C(); line(g, 4, 11, 11, 4, 'p', 2)
for cx, cy in ((3, 11), (4, 12.5), (11, 3.2), (12.6, 4.2)): disc(g, cx, cy, 1.5, 'p')
shade(g); put(g, 3, 10, 'p'); put(g, 11, 2, 'p')
for (x, y) in ((1, 15), (2, 14), (0, 13), (5, 15)): put(g, x, y, 'y')
I['boneBolt'] = g
# 2 Mask Wave: a Mask-family face with eye slits and a big signal crescent swoosh underneath
g = C(); ell(g, 8, 5.5, 5.2, 4.2, 'p'); shade(g)
rect(g, 5, 4, 6, 5, '#'); rect(g, 9, 4, 10, 5, '#'); put(g, 7, 7, '#'); put(g, 8, 7, '#')
arc(g, 8, 6, 8.2, 25, 155, 'y', 2); arc(g, 8, 6, 9.6, 50, 130, 'g')
I['maskWave'] = g
# 3 Kin Orbit: a tiny Friend in the middle, three signal orbs on a dotted orbit
g = C()
for k in range(0, 360, 20): put(g, 7.5 + math.cos(math.radians(k)) * 6.6, 7.5 + math.sin(math.radians(k)) * 6.6, 'g')
rect(g, 6, 5, 9, 9, 'p'); rect(g, 6, 10, 6, 10, 'p'); rect(g, 9, 10, 9, 10, 'p'); put(g, 6, 4, 'p'); put(g, 9, 4, 'p')
put(g, 7, 7, '#'); put(g, 8, 7, '#'); rect(g, 9, 6, 9, 9, 'g')
for a in (300, 60, 180):
    x, y = 7.5 + math.cos(math.radians(a)) * 6.6, 7.5 + math.sin(math.radians(a)) * 6.6
    disc(g, x, y, 1.3, 'y'); put(g, x - 0.6, y - 0.6, 'p')
I['kinOrbit'] = g
# 4 Split Cell: a big cell pinching into two daughter cells
g = C(); disc(g, 5.5, 8, 4.4, 'y'); disc(g, 12, 4.5, 2.6, 'y'); disc(g, 12, 11.5, 2.6, 'y')
line(g, 9, 7, 10.5, 5.5, 'y', 2); line(g, 9, 9, 10.5, 10.5, 'y', 2)
disc(g, 5, 7.5, 1.6, 'p'); put(g, 12, 4, 'p'); put(g, 12, 11, 'p'); shade(g, 'y', 'g'); disc(g, 5, 7.5, 1.6, 'p'); put(g, 4, 7, '#')
I['splitCell'] = g
# 5 Offset Shot: two arrows fanning out, signal heads, grey fletching
g = C()
for (x0, y0, x1, y1) in ((2, 14, 11, 3), (2, 14, 14, 9)):
    line(g, x0, y0, x1, y1, 'p')
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; px, py = -uy, ux
    for s in (0, 1, 2):
        for w in range(-s, s + 1): put(g, x1 - ux * s + px * w * 0.8, y1 - uy * s + py * w * 0.8, 'y')
    for s in (1, 2): put(g, x0 + ux * s + px * 1.2, y0 + uy * s + py * 1.2, 'g'); put(g, x0 + ux * s - px * 1.2, y0 + uy * s - py * 1.2, 'g')
I['offsetShot'] = g
# 6 Signal Pulse: concentric signal waves from a core, dotted outer ring, sparks
g = C()
for k in range(0, 360, 24): put(g, 7.5 + math.cos(math.radians(k)) * 7, 7.5 + math.sin(math.radians(k)) * 7, 'g')
arc(g, 7.5, 7.5, 4.8, 0, 360, 'y'); disc(g, 7.5, 7.5, 2, 'y'); disc(g, 7.2, 7.2, 0.7, 'p')
for (x, y) in ((1, 1), (14, 2), (2, 14), (14, 14)): put(g, x, y, 'p')
I['signalPulse'] = g
# 7 Drift Mines: a spiked mine with a blinking signal core and a dotted trail
g = C()
for a in range(0, 360, 45): line(g, 9 + math.cos(math.radians(a)) * 3.5, 7 + math.sin(math.radians(a)) * 3.5, 9 + math.cos(math.radians(a)) * 6, 7 + math.sin(math.radians(a)) * 6, 'p')
disc(g, 9, 7, 3.7, 'p'); shade(g); disc(g, 9, 7, 1.5, 'y'); put(g, 8, 6, 'p')
for (x, y) in ((1, 14), (3, 13), (5, 12)): put(g, x, y, 'g')
I['driftMines'] = g
# 8 Quake Stamp: a fist slamming the ground, cracks and dust
g = C(); rect(g, 4, 1, 11, 7, 'p'); rect(g, 3, 3, 3, 6, 'p'); rect(g, 5, 8, 10, 9, 'p'); shade(g)
for x in (6, 8, 10): line(g, x, 1, x, 3, '#')
rect(g, 0, 11, 15, 11, 'y'); line(g, 8, 12, 5, 15, 'g'); line(g, 8, 12, 11, 15, 'g'); line(g, 8, 12, 8, 15, 'g')
for (x, y) in ((1, 9), (14, 9), (2, 8), (13, 8)): put(g, x, y, 'p')
I['quakeStamp'] = g
# 9 Glitter Bounce: a sparkle star bouncing along a dotted zigzag
g = C()
for (x, y) in ((1, 14), (2, 12), (3, 10), (4, 12), (5, 14), (6, 12), (7, 10)): put(g, x, y, 'g')
line(g, 11, 1, 11, 11, 'y'); line(g, 6, 6, 16, 6, 'y'); disc(g, 11, 6, 1.6, 'y'); put(g, 11, 6, 'p'); put(g, 10, 5, 'p')
for (x, y) in ((14, 2), (8, 3), (14, 10)): put(g, x, y, 'p')
I['glitterBounce'] = g
# 10 Void Beam: an eye firing a piercing beam to the right
g = C(); ell(g, 4.5, 7.5, 4, 3, 'p'); shade(g); disc(g, 4.5, 7.5, 1.8, '#'); put(g, 4, 7, 'y'); put(g, 5, 7, 'y')
rect(g, 9, 6, 15, 9, 'y'); rect(g, 9, 7, 15, 8, 'p')
for (x, y) in ((11, 4), (14, 11), (13, 4)): put(g, x, y, 'g')
I['voidBeam'] = g
# 11 Swift Pixel: a winged sneaker with speed lines
g = C(); rect(g, 6, 5, 9, 10, 'p'); rect(g, 6, 10, 14, 12, 'p'); rect(g, 5, 12, 15, 13, 'g'); rect(g, 7, 7, 8, 7, 'y'); rect(g, 10, 10, 13, 10, 'y')
line(g, 10, 5, 14, 2, 'p'); line(g, 10, 6, 15, 4, 'p'); line(g, 10, 7, 13, 6, 'g')
for y in (7, 10, 13): line(g, 0, y, 3, y, 'g')
I['swiftPixel'] = g
# 12 Thick Outline: a signal heart with a paper shine and a grey rim
g = C(); disc(g, 5, 5.5, 3.4, 'y'); disc(g, 10.5, 5.5, 3.4, 'y')
for y in range(6, 15):
    for x in range(N):
        if abs(x - 7.75) <= (14 - y) * 1.1: g[y][x] = 'y'
shade(g, 'y', 'g'); rect(g, 3, 4, 4, 5, 'p'); put(g, 5, 3, 'p')
I['thickOutline'] = g
# 13 Magnet: a U magnet with signal poles and dotted field lines
g = C(); rect(g, 2, 6, 5, 12, 'p'); rect(g, 10, 6, 13, 12, 'p'); rect(g, 2, 11, 13, 14, 'p'); shade(g)
rect(g, 2, 4, 5, 5, 'y'); rect(g, 10, 4, 13, 5, 'y')
for k in range(200, 341, 20): put(g, 7.5 + math.cos(math.radians(k)) * 5, 5 + math.sin(math.radians(k)) * 4, 'g')
I['magnet'] = g
# 14 Overclock: a stopwatch with a signal button, ink hands and tick marks
g = C(); disc(g, 7.5, 9, 6, 'p'); shade(g); disc(g, 7.5, 9, 4.6, 'p')
rect(g, 6, 1, 9, 2, 'y'); rect(g, 7, 3, 8, 3, 'g'); line(g, 7.5, 9, 7.5, 5.5, '#'); line(g, 7.5, 9, 10.5, 10, '#'); put(g, 7.5, 9, 'y')
for a in (0, 90, 180, 270): put(g, 7.5 + math.cos(math.radians(a)) * 5.3, 9 + math.sin(math.radians(a)) * 5.3, '#')
put(g, 13, 3, 'y'); put(g, 14, 2, 'y')
I['overclock'] = g
# 15 Sharp Edge: a sword with a shining blade, signal guard and pommel
g = C(); line(g, 6, 10, 13, 3, 'p', 2); line(g, 7, 10, 14, 3, 'g'); put(g, 14, 1, 'p'); put(g, 13, 2, 'p')
line(g, 3, 8, 8, 13, 'y', 2); line(g, 2.5, 13.5, 5, 11, 'g', 2); disc(g, 1.8, 14.2, 1, 'y'); put(g, 10, 5, 'y')
I['sharpEdge'] = g
# 16 Wide Frame: a frame with four signal arrows pushing out to the corners
g = C(); rect(g, 5, 5, 10, 10, 'p'); rect(g, 6, 6, 9, 9, '#'); rect(g, 7, 7, 8, 8, 'g')
for (x, y, dx, dy) in ((1, 1, 1, 1), (14, 1, -1, 1), (1, 14, 1, -1), (14, 14, -1, -1)):
    put(g, x, y, 'y'); put(g, x + dx, y, 'y'); put(g, x + 2 * dx, y, 'y'); put(g, x, y + dy, 'y'); put(g, x, y + 2 * dy, 'y'); put(g, x + dx, y + dy, 'y'); put(g, x + 2 * dx, y + 2 * dy, 'y')
I['wideFrame'] = g
# 17 Patch (heal): a plus with a shine and a soft rim
g = C(); rect(g, 6, 2, 9, 13, 'y'); rect(g, 2, 6, 13, 9, 'y'); shade(g, 'y', 'g'); rect(g, 6, 3, 7, 4, 'p'); put(g, 3, 7, 'p')
I['heal'] = g
# 18 Evolution: stacked chevrons rising to a sparkle
g = C()
for top in (2, 7):
    for i in range(6): put(g, 7.5 - i, top + i, 'y'); put(g, 7.5 + i, top + i, 'y'); put(g, 7.5 - i, top + i + 1, 'g'); put(g, 7.5 + i, top + i + 1, 'g')
line(g, 7.5, 12, 7.5, 15, 'p', 2); put(g, 13, 1, 'p'); put(g, 12, 2, 'p'); put(g, 14, 2, 'p'); put(g, 13, 3, 'p'); put(g, 2, 12, 'p')
I['evolution'] = g


# Hand-drawn overrides (pixel by pixel) where primitives rounded badly.
HAND = {
  'kinOrbit': [
    '.....g....g.....',
    '..g........yy...',
    '..........yppy..',
    '..........yyyy..',
    '.g............g.',
    '......p..p......',
    '......pppp......',
    'g....pp#p#p....g',
    'g....pppppp.....',
    '.....ppppgp....g',
    '......p..p......',
    '.g............g.',
    '..yy............',
    '.yppy.......g...',
    '.yyyy..g..g.....',
    '................',
  ],
  'splitCell': [
    '................',
    '..........yyy...',
    '...yyyy..yyyyy..',
    '..yyyyyy.yypyy..',
    '.yyyyyyyyyyyyg..',
    'yyyppyyyy.yyg...',
    'yyppppyyy.......',
    'yypp#pyyy.......',
    'yyppppyyy.......',
    'yyyppyyyy.yyy...',
    '.yyyyyyyyyyyyy..',
    '..yyyyyg.yypyy..',
    '...gggg..yyyyg..',
    '..........ggg...',
    '................',
    '................',
  ],
  'driftMines': [
    '................',
    '.......p........',
    '...p...p...p....',
    '....p.ppp.p.....',
    '.....ppppp......',
    '...ppppyppppp...',
    '....ppyyypg.....',
    '.....ppyppg.....',
    '....p.pggg.p....',
    '...p...g...p....',
    '.......p........',
    '................',
    '.g..............',
    '...g............',
    '.....g..........',
    '................',
  ],
  'swiftPixel': [
    '................',
    '................',
    '................',
    '.pp.............',
    '..ppp...........',
    '.ppppp..........',
    '...ppp.pppp.....',
    '.......pyyp.....',
    '.......pyyp.....',
    '.......ppppppp..',
    'gg....ppppyyppp.',
    '......pppppppppp',
    'ggg..ggggggggggg',
    '................',
    'gg..............',
    '................',
  ],
  'sharpEdge': [
    '..............pp',
    '.............ppg',
    '............ppg.',
    '...........ppg..',
    '..........ppg...',
    '.........ppg....',
    '........ppg.....',
    '....y..ppg......',
    '.....yppg.......',
    '......yy........',
    '.....g.yy.......',
    '....g...y.......',
    '...g............',
    '..g.............',
    '.yy.............',
    '.yy.............',
  ],
  'evolution': [
    '.............p..',
    '.......yy...ppp.',
    '......yyyy...p..',
    '.....yyggyy.....',
    '....yyg..gyy....',
    '...yyg....gyy...',
    '.......yy.......',
    '......yyyy......',
    '.....yyggyy.....',
    '....yyg..gyy....',
    '...yyg....gyy...',
    '.......pp.......',
    '.......pp.......',
    '..p....pp.......',
    '.......pp.......',
    '................',
  ],
}
for k, rows in HAND.items():
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (k, [len(r) for r in rows])
    I[k] = [list(r) for r in rows]

out = ['// Generated by tools/icons16.py — 16×16 power icons for dark tiles: "#" ink, "y" signal, "p" paper, "g" grey, "." empty.',
       'export const ICONS16: Readonly<Record<string, readonly string[]>> = {']
for k, v in I.items():
    rows = [''.join(r) for r in v]; assert len(rows) == 16 and all(len(r) == 16 for r in rows), k
    out.append(f'  {k}: [' + ', '.join(f"'{r}'" for r in rows) + '],')
out.append('};\n')
open(sys.argv[1], 'w').write('\n'.join(out)); print(len(I), 'icons')
