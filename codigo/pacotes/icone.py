# Draws the Reino Pequeno icon from the game's own sprites: sky and grass, the blue castle and a warrior.
# Usage: python3 icone.py <out-dir>   ->  icon-1024.png, icon-512.png, icon-192.png, icon-180.png, android sizes, icon.ico, icon.icns
import os, sys, struct, io
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, '..', 'assets')

def frame(name, i=0, fw=192, fh=192):
    im = Image.open(os.path.join(A, name + '.png')).convert('RGBA')
    return im.crop((i * fw, 0, i * fw + fw, fh))

def master(size=1024):
    s = size
    im = Image.new('RGBA', (s, s))
    d = ImageDraw.Draw(im)
    for y in range(s):                     # sky to grass
        t = y / s
        if t < .62:
            k = t / .62; c = (int(58 + 40 * k), int(150 + 40 * k), int(170 + 10 * k))
        else:
            k = (t - .62) / .38; c = (int(92 - 30 * k), int(178 - 40 * k), int(70 - 20 * k))
        d.line([(0, y), (s, y)], fill=c + (255,))
    castle = frame('b_castle', 0, 320, 256).crop((4, 41, 316, 249))
    cw = int(s * .80); ch = int(castle.height * cw / castle.width)
    castle = castle.resize((cw, ch), Image.NEAREST)
    sh = Image.new('RGBA', (s, s)); ImageDraw.Draw(sh).ellipse((s * .12, s * .70, s * .88, s * .80), fill=(20, 40, 20, 90))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(s / 60)))
    im.alpha_composite(castle, ((s - cw) // 2, int(s * .76) - ch))
    war = frame('b_warrior_idle', 0).crop((59, 48, 143, 137))
    ww = int(s * .30); wh = int(war.height * ww / war.width)
    war = war.resize((ww, wh), Image.NEAREST)
    im.alpha_composite(war, (int(s * .62), int(s * .93) - wh))
    # rounded corners
    m = Image.new('L', (s, s), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * .18), fill=255)
    out = Image.new('RGBA', (s, s)); out.paste(im, (0, 0), m)
    return out, im

def icns(imgs):
    # PNG-backed icns: ic07 128, ic08 256, ic09 512, ic10 1024
    parts = b''
    for tag, sz in [(b'ic07', 128), (b'ic08', 256), (b'ic09', 512), (b'ic10', 1024)]:
        b = io.BytesIO(); imgs.resize((sz, sz), Image.LANCZOS).save(b, 'PNG'); data = b.getvalue()
        parts += tag + struct.pack('>I', len(data) + 8) + data
    return b'icns' + struct.pack('>I', len(parts) + 8) + parts

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out, exist_ok=True)
    rounded, square = master(1024)
    for sz in (1024, 512, 192, 180, 128, 64, 48, 32):
        (square if sz == 180 else rounded).resize((sz, sz), Image.LANCZOS).save(f'{out}/icon-{sz}.png')
    for dpi, sz in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
        rounded.resize((sz, sz), Image.LANCZOS).save(f'{out}/android-{dpi}.png')
    rounded.save(f'{out}/icon.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    open(f'{out}/icon.icns', 'wb').write(icns(rounded))
    print('icons in', out)
