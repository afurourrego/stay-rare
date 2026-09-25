"""Stay Rare pixel logo (1-bit style): hand-drawn 6x7 glyphs, 2 px strokes, a paper outline, a signal drop shadow and
one glitched slice (a single row of "RARE" slipped 1 px right, with red static where it tore), written to games/stay-rare/logo.png. Dev tool; run
`python3 tools/logo.py` after editing a glyph."""
from PIL import Image

INK, PAPER, SIGNAL, RED = (17, 17, 17, 255), (238, 238, 238, 255), (204, 255, 0, 255), (232, 32, 42, 255)
G = {
    'S': ['.####.', '##..##', '##....', '.####.', '....##', '##..##', '.####.'],
    'T': ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..'],
    'A': ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
    'Y': ['##..##', '##..##', '##..##', '.####.', '..##..', '..##..', '..##..'],
    'R': ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
    'E': ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
}
WORD_GAP, LETTER_GAP, PAD = 4, 1, 2

def word_pixels(text):
    px, x = set(), 0
    for i, ch in enumerate(text):
        if ch == ' ':
            x += WORD_GAP - LETTER_GAP
            continue
        for y, row in enumerate(G[ch]):
            for dx, c in enumerate(row):
                if c == '#':
                    px.add((x + dx, y))
        x += len(G[ch][0]) + LETTER_GAP
    return px, x - LETTER_GAP

ink, width = word_pixels('STAY RARE')
# The static: row 2 of "RARE" slips 1 px right, leaving a few red pixels where it tore.
rare_x = next(x for x in range(width) if x > 27)
glitched = set()
for (x, y) in ink:
    glitched.add((x + 1, y) if y == 2 and x >= rare_x else (x, y))
tears = {(x, y) for (x, y) in ink if y == 2 and x >= rare_x and (x, y) not in glitched}
ink = glitched
W, H = width + 2 + PAD * 2, 7 + 2 + PAD * 2
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
put = lambda p, c: img.putpixel((p[0] + PAD, p[1] + PAD), c)
shadow = {(x + 1, y + 1) for (x, y) in ink}
outline = {(x + dx, y + dy) for (x, y) in ink | shadow for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
for p in outline:
    if 0 <= p[0] + PAD < W and 0 <= p[1] + PAD < H: put(p, PAPER)
for p in shadow: put(p, SIGNAL)
for p in sorted(tears)[::2]: put(p, RED)
for p in ink: put(p, INK)
img.save('games/stay-rare/logo.png')
print('logo', W, 'x', H)
