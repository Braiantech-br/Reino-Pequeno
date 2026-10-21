# The Tiny Swords sprites are not published loose in the repository (license). When codigo/assets/ is missing,
# they are taken back out of the game already published (atualizacao/jogo.html), where they travel embedded.
import base64, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
CODE = os.path.dirname(HERE)
REPO = os.path.dirname(CODE)

def ensure_assets():
    A = os.path.join(CODE, 'assets')
    if os.path.isdir(A) and any(f.endswith('.png') for f in os.listdir(A)): return 0
    src = os.path.join(REPO, 'atualizacao', 'jogo.html')
    if not os.path.exists(src): raise SystemExit('Faltam as imagens: coloque a pasta codigo/assets/ ou o atualizacao/jogo.html.')
    html = open(src, encoding='utf-8').read()
    m = re.search(r'window\.__A=(\{.*?\});function AS', html, re.S)
    if not m: raise SystemExit('Não achei as imagens dentro de atualizacao/jogo.html.')
    os.makedirs(A, exist_ok=True)
    n = 0
    for k, uri in json.loads(m.group(1)).items():
        open(os.path.join(A, k + '.png'), 'wb').write(base64.b64decode(uri.split(',', 1)[1])); n += 1
    print('imagens extraídas do jogo publicado:', n)
    return n
