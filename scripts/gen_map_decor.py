#!/usr/bin/env python3
"""
Generates the pixel-art decoration atlases used by src/factories/mapDecorFactory.ts.

Everything is authored at true pixel scale (32x32 cells) to match the game's
`pixelArt: true` renderer and the existing 32px Tiled grid. The palette is
sampled from assets/tilesets/new-sand-tile.png so the new art sits in the same
world as the tiles already on the map:

    water  #4DA6FF      sand  #FFE478 / #FFD83D / #FFD322 / #F9C22B

Sprites are string art with a shared colour key:

    '.' outline   'a' dark   'b' mid   'c' light   'd' highlight
    'h' gem dark  'g' gem    'G' gem light   'W' gem specular

Ore rocks reuse one silhouette per shape and swap only the gem ramp, so gold /
amethyst / copper / emerald variants stay visually consistent.

Run from the repo root:  python scripts/gen_map_decor.py
Outputs into assets/tilesets/decor/.
"""

import math
import os

from PIL import Image

OUT_DIR = os.path.join("assets", "tilesets", "decor")

CELL = 32
CLEAR = (0, 0, 0, 0)


# --------------------------------------------------------------------------- #
# Palette
# --------------------------------------------------------------------------- #

WATER = (77, 166, 255, 255)   # exact sea tile colour from new-sand-tile.png
WATER_LITE = (102, 182, 255, 255)    # only just off the base, to stay calm
WATER_LITE2 = (145, 210, 255, 255)  # crest sparkle, used sparingly
FOAM = (232, 246, 255, 255)
FOAM_SOFT = (198, 232, 255, 255)


def ramp(*hexes):
    """Palette ramp, darkest (outline) first -> brightest (highlight) last."""
    out = []
    for h in hexes:
        h = h.lstrip("#")
        out.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255))
    return out


# Cool, fairly dark grey so stone reads clearly against #4DA6FF water.
ROCK_WET = ramp("1E2B3A", "31465C", "48627C", "63809B", "8AA5BC")
# Warmer and lighter, to separate from yellow sand without going muddy.
ROCK_DRY = ramp("3D3629", "5C5344", "7D7364", "A09686", "C6BCAB")

ORE = {
    "gold": ramp("8A5A0E", "D99B1F", "FFCF3D", "FFF0A8"),
    "amethyst": ramp("4E1F7D", "8B3FC4", "B36BE8", "EAC9FF"),
    "copper": ramp("7A2F10", "C05A24", "E8853D", "FFC79A"),
    "emerald": ramp("0D5231", "1B8F55", "3FC177", "A6F5CA"),
}

CORAL_PINK = ramp("A63A55", "D9536F", "FF7A8A", "FFB6C0")
CORAL_ORANGE = ramp("A6521A", "D97A22", "FF9E4B", "FFCE9A")
WEED = ramp("0F4526", "1F7A45", "2FA35E", "56CC85")
WEED_ALT = ramp("104A3C", "1E7A63", "2CA383", "52CCA9")
WOOD = ramp("352614", "63482B", "87643D", "AD8A5D")
GRASS = ramp("24501A", "3E7A27", "5FA83B", "8ACF60")
SHELL_PAL = ramp("7A5A45", "C4A184", "E8CDB0", "FFF4E4")
STAR = ramp("96481A", "E0762A", "FF9E4B", "FFD0A2")
BUBBLE_PAL = ramp("2E7BD1", "6FB6F5", "BEE2FF", "F2FAFF")


# --------------------------------------------------------------------------- #
# String-art plumbing
# --------------------------------------------------------------------------- #

def art(rows):
    """Right-pad a string-art block so trailing spaces need not be typed."""
    w = max(len(r) for r in rows)
    return [r.ljust(w) for r in rows]


def key_for(pal, gem=None):
    key = {
        " ": None,
        ".": pal[0],
        "a": pal[1],
        "b": pal[2],
        "c": pal[3],
        "d": pal[4] if len(pal) > 4 else pal[3],
    }
    if gem:
        key.update({"h": gem[0], "g": gem[1], "G": gem[2], "W": gem[3]})
    return key


def from_art(rows, key):
    h = len(rows)
    w = max(len(r) for r in rows)
    img = Image.new("RGBA", (w, h), CLEAR)
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = key.get(ch)
            if c:
                px[x, y] = c
    return img


def new_cell():
    return Image.new("RGBA", (CELL, CELL), CLEAR)


def cell(rows, pal, gem=None, dy=0):
    """Render string art bottom-aligned and centred in a 32x32 cell."""
    sprite = from_art(rows, key_for(pal, gem))
    w, h = sprite.size
    out = new_cell()
    out.alpha_composite(sprite, ((CELL - w) // 2, CELL - h - dy))
    return out


def checker(x, y):
    return (x + y) % 2 == 0


# --------------------------------------------------------------------------- #
# Rocks
# --------------------------------------------------------------------------- #

ROCK_SMALL = art([
    "    .....    ",
    "  ..ddddc..  ",
    " .dddccbbba. ",
    ".ddccbbbbbaa.",
    ".cbbbbbbbaaa.",
    " .bbbbaaaaa. ",
    " .aaaaaaaaa. ",
    "  .........  ",
])

ROCK_MID = art([
    "      ......",
    "   ...dddddc..",
    "  ..dddddccbba.",
    " .ddddccbbbbbaa.",
    ".dddccbbbbbbbbaa.",
    ".ddccbbbbbbbbbaaa.",
    ".dcbbbb.bbbbbbaaa.",
    ".cbbbbb.bbbbbaaaa.",
    ".bbbbbb.abbaaaaaaa.",
    ".abbbbbbaaaaaaaaa..",
    " .aaaaaaaaaaaaaa.",
    "  ..............",
])

BOULDER = art([
    "        ........",
    "     ...dddddddc..",
    "   ..ddddddddccbba..",
    "  .dddddddddccbbbbaa.",
    " .ddddddddccbbbbbbbaa.",
    " .dddddddccbbbbbbbbbaa.",
    ".ddddddccbbb.bbbbbbbaaa.",
    ".dddddccbbbb.bbbbbbaaaa.",
    ".ddddccbbbbb.abbbbbaaaa.",
    ".dddccbbbbbbb.abbbaaaaa.",
    ".ddccbbbbbbbb.abbaaaaaa.",
    ".dccbbbbbbbbbb.baaaaaaa.",
    ".cbbbbbbbbbbbb.aaaaaaaa.",
    ".bbbbbbbbbbbbbaaaaaaaaa.",
    ".abbbbbbbbbbbaaaaaaaaa..",
    " .abbbbbbbbaaaaaaaaaa.",
    " ..aaaaaaaaaaaaaaaaa..",
    "  ..................",
])

ROCK_CLUSTER = art([
    "            ....             ",
    "     ....  .dddc..           ",
    "   ..dddc..dddccba.    ...   ",
    "  .ddddccbdddccbbba.  .dc..  ",
    " .dddccbbbddccbbbbaa..ddcba. ",
    " .ddccbbbbdccbbbbbaa.ddccbba.",
    ".ddccbbbbbccbbbbbaaa.dccbbaa.",
    ".dccbbbaaabbbbbaaaaacbbbaaaa.",
    ".cbbbbaaaabbbbaaaaaabbbaaaaa.",
    ".bbbaaaaaabbbaaaaaaabbaaaaa..",
    ".abaaaaaaaabaaaaaaaaaaaaaa.. ",
    " .aaaaaaaaaaaaaaaaaaaaaaa.   ",
    " ..aaaaaaaaaaaaaaaaaaaaa..   ",
    "  .......................    ",
])

# Ore silhouettes. Crystal shards sit proud of the stone (3-4px wide with their
# own light/dark facets) so the ore still reads at 1x, plus one gem socket set
# into the body. Only the gem ramp changes between the gold/amethyst/etc. cuts.
ORE_ROCK_A = art([
    "    W",
    "   GGW    W",
    "   GgW   GGW",
    "   Ggh   GgW   ....",
    "  .Ggh.  Ggh..dddc..",
    "  .Ggh...Ggh.dddccba.",
    " ..hh..hh.hh.ddccbbba.",
    " .dddccbbbbbbbdccbbbaa.",
    ".dddccbbbbbbbbbbbbbaaaa.",
    ".ddccbbbbbbbbbbbbbbaaaa.",
    ".dccbbbbGGWbbbbbbbaaaaa.",
    ".cbbbbbbGgWbbbbbaaaaaaa.",
    ".bbbbbbb.hh.bbbaaaaaaaa.",
    ".abbbbbbbbbbbbaaaaaaaa..",
    " .abbbbbbbbbaaaaaaaaa.",
    " ..aaaaaaaaaaaaaaaaa..",
    "  ..................",
])

ORE_ROCK_B = art([
    "              W",
    "         W   GGW",
    "        GGW  GgW",
    "   ...  GgW  Ggh",
    " ..dddc.Ggh .Ggh",
    " .dddddc.hh..hh.",
    " .ddddccbbbbdccb..",
    ".dddccbbbbbbbbbbaa.",
    ".ddccbbbbbbbbbbbaaa.",
    ".dccbbbbbbbbbbbaaaaa.",
    ".cbbbb.bbbbbbbaaaaaa.",
    ".cbbbb.bbbbbaaaaaaaa.",
    ".bbbbb.bbbaaaaaaaaaa.",
    ".abbbbbbbaaaaaaaaaa..",
    " .abbbbbbaaaaaaaaaa.",
    " ..aaaaaaaaaaaaaaa..",
    "  ................",
])

ORE_ROCK_C = art([
    "    W",
    "   GGW",
    "   GgW   ...",
    "  .Ggh..ddcc..",
    "  ..hh.dddccba.",
    " .dddccbbbbbbaa.",
    ".dddccbbbbbbbaaa.",
    ".ddccbbGGWbbbaaaa.",
    ".dccbbbGgWbbaaaaa.",
    ".cbbbbb.hh.baaaaa.",
    ".bbbbbbbbbbaaaaaa.",
    ".abbbbbbbaaaaaaa..",
    " .aaaaaaaaaaaaa.",
    " ..............",
])

PEBBLES = art([
    "  ...    ..   ...  ",
    " .dcb.  .dc. .dcb. ",
    ".cbba. .cbba..cbba.",
    ".aaa.. .aaa.  .aaa.",
    " ....   ...    ... ",
])


# --------------------------------------------------------------------------- #
# Flora, shells, wood
# --------------------------------------------------------------------------- #

CORAL_BRANCH = art([
    "  ..      ..    ",
    " .cb.    .cb.   ",
    " .bb.   .cbb.   ",
    " .ba.  .cbb.    ",
    "  .ba. .bb.     ",
    "   .ba..bb.  .. ",
    "    .bbbb.  .cb.",
    "    .cbbb.  .bb.",
    "     .bbb. .bb. ",
    "     .bba..bb.  ",
    "      .bbabb.   ",
    "      .cbbbb.   ",
    "      .bbbba.   ",
    "      .abbba.   ",
    "      .aabaa.   ",
    "     ..aaaa..   ",
    "     .aaaaaa.   ",
    "     ........   ",
])

CORAL_FAN = art([
    "   ..  ..  ..   ",
    "  .cb..cb..cb.  ",
    "  .bb..bb..bb.  ",
    " .cbb..bb..bba. ",
    " .bba..bb..abb. ",
    " .bb.a.bb.a.bb. ",
    " .bbabbbbbbabbb.",
    "  .bbbbbbbbbbb. ",
    "  .cbbbbbbbbba. ",
    "   .abbbbbbba.  ",
    "    .aabbbaa.   ",
    "     .aaaaa.    ",
    "     .aaaaa.    ",
    "     .......    ",
])

SEAWEED_TALL = art([
    "   ..   ",
    "  .cb.  ",
    "  .bb.  ",
    " .cb..  ",
    " .bb.   ",
    "  .bb.  ",
    "  .cbb. ",
    "   .bb. ",
    "  .cb.  ",
    "  .bb.  ",
    " .cb.   ",
    " .bb.   ",
    "  .bb.  ",
    "  .cbb. ",
    "   .bb. ",
    "  .cb.  ",
    "  .bb.  ",
    "  .ba.  ",
    "  .aa.  ",
    " ..aa.. ",
    " .aaaa. ",
    " ...... ",
])

SEAWEED_SHORT = art([
    " ..   .. ",
    ".cb. .cb.",
    ".bb. .bb.",
    " .bb..bb.",
    "  .cbbbb.",
    "  .bbbba.",
    " .cbbbba.",
    " .bbbba. ",
    " .abba.  ",
    " .aaaa.  ",
    " ......  ",
])

STARFISH = art([
    "     ...     ",
    "    .cbc.    ",
    "    .bcb.    ",
    "..  .bcb.  ..",
    ".c...bcb...c.",
    ".bcccbcbcccb.",
    " .bbbcccbbb. ",
    " ..bbbcbbb.. ",
    "  .bb.c.bb.  ",
    "  .b. . .b.  ",
    "  ..     ..  ",
])

SHELL_ART = art([
    "   ...   ",
    "  .cbc.  ",
    " .cbcbc. ",
    ".cbcbcbc.",
    ".bcbcbcb.",
    ".abababa.",
    " .aaaaa. ",
    " ....... ",
])

DRIFTWOOD = art([
    "      ....         ",
    "  ....baa....      ",
    "..bcbbbabbcb....   ",
    ".cbbabbbbaabbcba.  ",
    ".abbbbaabbbbbabba..",
    "..aabbbbbabbaabbba.",
    "  ...aaaa..aabbaa. ",
    "        ....aaa..  ",
    "           ....    ",
])

GRASS_TUFT = art([
    " .    .   . ",
    ".c.  .c. .c.",
    ".b. .cb..cb.",
    ".b..cb..bb. ",
    ".bacb..bb.  ",
    ".abbbabb.   ",
    " .aaabba.   ",
    "  .......   ",
])

BUSH = art([
    "    .....    ",
    "  ..dcdcd..  ",
    " .dcbcbcbcd. ",
    ".dcbcbbcbcbd.",
    ".cbbcbbbcbbc.",
    ".bbbbabbbabb.",
    ".abbbbabbbba.",
    " .abbbabbba. ",
    " ..aabbbaa.. ",
    "   ..aaa..   ",
    "    .a.a.    ",
    "    .a.a.    ",
    "    .....    ",
])

BUBBLES = art([
    "      ..  ",
    "     .dc. ",
    "     .cb. ",
    "      ..  ",
    "  ..      ",
    " .dc.     ",
    " .cb.     ",
    "  ..      ",
    "     ..   ",
    "    .dc.  ",
    "    .cb.  ",
    "     ..   ",
])


# --------------------------------------------------------------------------- #
# Atlas assembly
# --------------------------------------------------------------------------- #

def atlas(cells, cols=8):
    rows = (len(cells) + cols - 1) // cols
    img = Image.new("RGBA", (cols * CELL, rows * CELL), CLEAR)
    for i, c in enumerate(cells):
        img.alpha_composite(c, ((i % cols) * CELL, (i // cols) * CELL))
    return img


def build_underwater():
    """Frame order is a contract with UNDERWATER in mapDecorFactory.ts."""
    return atlas([
        cell(ROCK_SMALL, ROCK_WET),                     # 0  rock small
        cell(ROCK_MID, ROCK_WET),                       # 1  rock medium
        cell(BOULDER, ROCK_WET),                        # 2  boulder
        cell(ROCK_CLUSTER, ROCK_WET),                   # 3  rock cluster
        cell(ORE_ROCK_A, ROCK_WET, ORE["gold"]),        # 4  ore: gold
        cell(ORE_ROCK_B, ROCK_WET, ORE["amethyst"]),    # 5  ore: amethyst
        cell(ORE_ROCK_A, ROCK_WET, ORE["copper"]),      # 6  ore: copper
        cell(ORE_ROCK_C, ROCK_WET, ORE["emerald"]),     # 7  ore: emerald
        cell(CORAL_BRANCH, CORAL_PINK),                 # 8  coral branch
        cell(CORAL_FAN, CORAL_ORANGE),                  # 9  coral fan
        cell(SEAWEED_TALL, WEED),                       # 10 seaweed tall
        cell(SEAWEED_SHORT, WEED_ALT),                  # 11 seaweed short
        cell(STARFISH, STAR),                           # 12 starfish
        cell(SHELL_ART, SHELL_PAL),                     # 13 shell
        cell(BUBBLES, BUBBLE_PAL, dy=6),                # 14 bubbles
        cell(PEBBLES, ROCK_WET),                        # 15 pebbles
    ])


def build_island():
    """Frame order is a contract with ISLAND in mapDecorFactory.ts."""
    return atlas([
        cell(BOULDER, ROCK_DRY),                        # 0  boulder
        cell(ROCK_MID, ROCK_DRY),                       # 1  rock medium
        cell(ROCK_SMALL, ROCK_DRY),                     # 2  rock small
        cell(PEBBLES, ROCK_DRY),                        # 3  pebbles
        cell(ORE_ROCK_B, ROCK_DRY, ORE["gold"]),        # 4  ore: gold
        cell(ORE_ROCK_C, ROCK_DRY, ORE["amethyst"]),    # 5  ore: amethyst
        cell(ORE_ROCK_A, ROCK_DRY, ORE["copper"]),      # 6  ore: copper
        cell(DRIFTWOOD, WOOD),                          # 7  driftwood
        cell(GRASS_TUFT, GRASS),                        # 8  grass tuft
        cell(BUSH, GRASS),                              # 9  bush
        cell(STARFISH, STAR),                           # 10 starfish
        cell(SHELL_ART, SHELL_PAL),                     # 11 shell
    ])


# --------------------------------------------------------------------------- #
# Animated water
# --------------------------------------------------------------------------- #

# (dash frequency, height wobble) per wave crest. Dash frequencies must be whole
# numbers so each crest wraps seamlessly across the tile's x edge.
CREST_SHAPE = [(2, 3.0), (3, 2.2), (2, 3.6)]


def water_frames(frames=8):
    """
    Seamless 32x32 water, tiling in both axes and looping over `frames`.

    Both sine terms use integer multiples of x/32 and y/32, so the tile wraps
    with no seam, and the phase advances exactly one period across the loop.
    Thresholds are deliberately lopsided so most of the tile stays the flat
    #4DA6FF of the original sea tile and only the shimmer moves.
    """
    sheet = Image.new("RGBA", (CELL * frames, CELL), CLEAR)
    for f in range(frames):
        p = f / frames
        c = Image.new("RGBA", (CELL, CELL), WATER)
        px = c.load()
        for y in range(CELL):
            for x in range(CELL):
                u, v = x / CELL, y / CELL

                # A slow swell over the whole tile gates how much ripple shows,
                # so some water is glassy and some is choppy. Without this the
                # crests below land on an obvious regular lattice.
                swell = math.sin(2 * math.pi * (u + v + 0.25 * p))
                gate = 0.62 + 0.38 * swell   # 0.24 .. 1.0

                # Crests run along x with their height wobbling in x and drifting
                # with the loop phase; a second sine per crest breaks it into
                # dashes. Differing dash frequencies keep streak lengths uneven.
                for i, (dash_freq, amp) in enumerate(CREST_SHAPE):
                    yc = i * (CELL / len(CREST_SHAPE)) + amp * math.sin(
                        2 * math.pi * (u + p + i * 0.37)
                    )
                    d = (y - yc) % CELL
                    if d > CELL / 2:
                        d -= CELL
                    dash = math.sin(2 * math.pi * (dash_freq * u - 1.4 * p + i * 0.41))

                    # Raise the bar where the swell is low, so calm patches stay
                    # bare. Anything denser than a few percent of the tile stops
                    # reading as water and starts reading as patterned wallpaper.
                    cut = 0.60 + 0.34 * (1.0 - gate)
                    if abs(d) < 0.8 and dash > cut + 0.30:
                        px[x, y] = WATER_LITE2
                        break
                    if abs(d) < 1.4 and dash > cut:
                        px[x, y] = WATER_LITE
                        break
        sheet.alpha_composite(c, (f * CELL, 0))
    return sheet


def foam_frames(frames=6, w=CELL, h=16):
    """
    Shoreline foam: a scalloped crest that rolls in and pulls back out. Kept on
    its own strip so it can straddle the sand/water tile boundary at y=128.
    """
    sheet = Image.new("RGBA", (w * frames, h), CLEAR)
    for f in range(frames):
        t = f / frames
        swell = 1.0 - abs(2.0 * t - 1.0)          # 0 -> 1 -> 0
        c = Image.new("RGBA", (w, h), CLEAR)
        px = c.load()
        for x in range(w):
            u = x / w
            edge = (math.sin(2 * math.pi * (u + t))
                    + 0.5 * math.sin(2 * math.pi * (2 * u - t)))
            top = 4.0 + 2.6 * (1.0 - swell) - 1.5 * edge
            thick = 2.0 + 2.4 * swell + 0.9 * edge
            y0 = int(round(top))
            y1 = int(round(top + thick))
            for y in range(max(0, y0), min(h, y1 + 1)):
                if y <= y0 + 1:
                    px[x, y] = FOAM
                elif y >= y1:
                    px[x, y] = FOAM_SOFT
                else:
                    px[x, y] = FOAM if checker(x, y) else FOAM_SOFT
        sheet.alpha_composite(c, (f * w, 0))
    return sheet


# --------------------------------------------------------------------------- #

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    outputs = {
        "underwater-decor.png": build_underwater(),
        "island-decor.png": build_island(),
        "water-anim.png": water_frames(),
        "shore-foam.png": foam_frames(),
    }
    for name, img in outputs.items():
        path = os.path.join(OUT_DIR, name)
        img.save(path)
        print(f"{path}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
