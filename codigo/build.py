# Builds the online page of Reino Pequeno from the source files (sprites stay as separate files in assets/).
import json, os
R = os.path.dirname(os.path.abspath(__file__))
S = f'{R}/src'
ORDER = ['core.js', 'ai.js', 'modes.js', 'life.js', 'trade.js', 'towns.js', 'diplo.js', 'army.js', 'scout.js', 'econ.js',
         'view.js', 'music.js', 'voice.js', 'ui.js', 'council.js']
head = open(f'{S}/head.html', encoding='utf-8').read().replace('/*BASECSS*/', open(f'{S}/base.css', encoding='utf-8').read())
meta = json.load(open(f'{R}/meta.json'))
js = '\n'.join(open(f'{S}/{f}', encoding='utf-8').read() for f in ORDER if os.path.exists(f'{S}/{f}'))
js = js.replace('const META=/*META*/{};', 'const META=' + json.dumps(meta, separators=(',', ':')) + ';')
page = head + "\n<script>\n(function(){\n'use strict';\n" + js + "\n})();\n</script>\n"
for name in ('index.html', 'preview.html'):
    open(f'{R}/{name}', 'w', encoding='utf-8').write(page)
print('built', len(page.encode()) // 1024, 'KB')
