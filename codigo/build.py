# Builds the online page of Reino Pequeno from the source files (sprites stay as separate files in assets/).
import json, os
R = os.path.dirname(os.path.abspath(__file__))
S = f'{R}/src'
import sys; sys.path.insert(0, f'{R}/pacotes')
import imagens; imagens.ensure_assets()      # the sprites come out of the published game when codigo/assets/ is missing
ORDER = ['core.js', 'ai.js', 'modes.js', 'life.js', 'trade.js', 'towns.js', 'diplo.js', 'army.js', 'scout.js', 'econ.js', 'tactics.js',
         'view.js', 'forge.js', 'music.js', 'voice.js', 'claude.js', 'council.js', 'ui.js', 'tutorial.js', 'editor.js', 'lives.js', 'net.js']
head = open(f'{S}/head.html', encoding='utf-8').read().replace('/*BASECSS*/', open(f'{S}/base.css', encoding='utf-8').read())
meta = json.load(open(f'{R}/meta.json'))
js = '\n'.join(open(f'{S}/{f}', encoding='utf-8').read() for f in ORDER if os.path.exists(f'{S}/{f}'))
js = js.replace('const META=/*META*/{};', 'const META=' + json.dumps(meta, separators=(',', ':')) + ';')
page = head + "\n<script>\n(function(){\n'use strict';\n" + js + "\n})();\n</script>\n"
# index.html is the artifact body (the host adds the document skeleton); preview.html is a full page for local tests
open(f'{R}/index.html', 'w', encoding='utf-8').write(page)
skel = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n')
# the preview carries the fonts inside (OFL fonts from fontes/), so it looks right even without internet
import base64, re
RNG = {'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
       'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'}
def font_css():
    css = ''
    for fam, pkg, weights in [('Jersey 10', 'jersey-10', [400]), ('Pixelify Sans', 'pixelify-sans', [400, 600, 700])]:
        for w in weights:
            for sub in ('latin', 'latin-ext'):
                f = f'{R}/fontes/{pkg}-{sub}-{w}-normal.woff2'
                data = base64.b64encode(open(f, 'rb').read()).decode()
                css += (f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;"
                        f"src:url(data:font/woff2;base64,{data}) format('woff2');unicode-range:{RNG[sub]}}}\n")
    return css
def embed_fonts(h):
    h = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', h)
    return re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', lambda m: '<style>\n' + font_css() + '</style>', h)
open(f'{R}/preview.html', 'w', encoding='utf-8').write(skel + embed_fonts(page) + '</body>\n</html>\n')
print('built', len(page.encode()) // 1024, 'KB')
