import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RES = "/Users/ionuteuro/Documents/kilo AI/generator-loto-6-49/android-app/android/app/src/main/res"
WEB = "/Users/ionuteuro/Documents/kilo AI/generator-loto-6-49"

FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

DENSITIES = {
    "mipmap-mdpi": 72,
    "mipmap-hdpi": 108,
    "mipmap-xhdpi": 144,
    "mipmap-xxhdpi": 216,
    "mipmap-xxxhdpi": 288,
}

BG_TOP = (106, 17, 203)    # #6A11CB
BG_BOTTOM = (37, 117, 252) # #2575FC
BALL = (255, 255, 255)
NUM = (27, 27, 31)
SHADOW = (0, 0, 0)

def make_gradient(size, top, bottom):
    w = h = size
    img = Image.new("RGB", (w, h))
    top_f = tuple(c / 255 for c in top)
    bot_f = tuple(c / 255 for c in bottom)
    px = img.load()
    for y in range(h):
        t = y / (h - 1)
        for x in range(w):
            u = (x / (w - 1) + t) / 2.0
            r = int((top_f[0] * (1 - u) + bot_f[0] * u) * 255)
            g = int((top_f[1] * (1 - u) + bot_f[1] * u) * 255)
            b = int((top_f[2] * (1 - u) + bot_f[2] * u) * 255)
            px[x, y] = (r, g, b)
    return img

def sphere_layer(size, cx, cy, r):
    """Return an RGBA image of a single shaded white ball."""
    # base white ball
    ball = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ball)
    bd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BALL + (255,))
    # radial shading: light from top-left, darker toward bottom-right
    lx, ly = cx - r * 0.35, cy - r * 0.35
    maxd = r * 1.25
    shade = Image.new("L", (size, size), 255)
    spx = shade.load()
    bb = (int(cx - r), int(cy - r), int(cx + r) + 1, int(cy + r) + 1)
    for y in range(bb[1], bb[3]):
        for x in range(bb[0], bb[2]):
            dist = ((x - lx) ** 2 + (y - ly) ** 2) ** 0.5
            f = max(0.0, min(1.0, dist / maxd))
            spx[x, y] = int(255 - f * 55)
    # multiply shading onto the white ball
    ball_rgb = ball.convert("RGB")
    white = Image.new("RGB", (size, size), (255, 255, 255))
    blended = Image.composite(white, ball_rgb, shade)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(blended, (0, 0))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    out.putalpha(mask)
    return out

def draw_number(size, s, cx, cy, r, text, font_size):
    font = ImageFont.truetype(FONT, int(font_size))
    d = ImageDraw.Draw(s)
    bbox = d.textbbox((0, 0), text, font=font, anchor="lt")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = cx - tw / 2 - bbox[0]
    y = cy - th / 2 - bbox[1] + r * 0.04
    d.text((x, y), text, font=font, fill=NUM + (255,))

def make_foreground(size):
    s = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sc = size / 108.0
    # soft shadow under the balls
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([(49 - 27) * sc, (62 - 24) * sc, (49 + 27) * sc, (62 + 24) * sc],
               fill=SHADOW + (55,))
    sh = sh.filter(ImageFilter.GaussianBlur(size * 0.03))
    s = Image.alpha_composite(s, sh)

    # big ball "6"
    big = sphere_layer(size, 49 * sc, 57 * sc, 27 * sc)
    s = Image.alpha_composite(s, big)
    draw_number(size, s, 49 * sc, 57 * sc, 27 * sc, "6", 42 * sc)

    # small ball "49"
    small = sphere_layer(size, 73 * sc, 38 * sc, 14 * sc)
    s = Image.alpha_composite(s, small)
    draw_number(size, s, 73 * sc, 38 * sc, 14 * sc, "49", 16 * sc)
    return s

def make_round(combined):
    size = combined.size[0]
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, size, size], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(combined, (0, 0), mask)
    return out

for folder, size in DENSITIES.items():
    fg = make_foreground(size)
    bg = make_gradient(size, BG_TOP, BG_BOTTOM)
    combined = Image.alpha_composite(bg.convert("RGBA"), fg)
    fpath = os.path.join(RES, folder)
    fg.save(os.path.join(fpath, "ic_launcher_foreground.png"))
    bg.save(os.path.join(fpath, "ic_launcher_background.png"))
    combined.convert("RGBA").save(os.path.join(fpath, "ic_launcher.png"))
    make_round(combined).save(os.path.join(fpath, "ic_launcher_round.png"))
    print("wrote", folder, size)

# Web / PWA icons
for size in (192, 512):
    fg = make_foreground(size)
    bg = make_gradient(size, BG_TOP, BG_BOTTOM)
    combined = Image.alpha_composite(bg.convert("RGBA"), fg).convert("RGB")
    combined.save(os.path.join(WEB, f"icon-{size}.png"))
    print("wrote web icon", size)
