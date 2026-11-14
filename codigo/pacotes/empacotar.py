# Builds every download of Reino Pequeno with one command:
#
#   python3 codigo/pacotes/empacotar.py 2.0
#
# What it makes (in dist/ at the root of the repository):
#   ReinoPequeno-<v>-Windows.zip, -Mac.zip, -Linux.zip, -Android.apk, -iPhone-iPad.zip, <v>.html, -completo.zip
#   site/  -> copied to the root of the repository: the web app (GitHub Pages) and atualizacao/ (the update channel)
#   --downloads also puts the installers in downloads/ (fixed names, linked from the README)
#   --sem-repo only builds dist/, without touching the repository
#
# Needs: python3 with Pillow; for Windows: x86_64-w64-mingw32-gcc/windres; for Android: aapt, javac,
# dalvik-exchange (or d8), zipalign, apksigner and the key (RP_KEYSTORE=path, RP_KEYSTORE_PASS=password).
# A step whose tools are missing is skipped with a message; the others still run.
# The sprites (Tiny Swords) are not in the repository: they are taken from codigo/assets/ or, when that folder
# is missing, extracted from atualizacao/jogo.html (the game already published).
import datetime, json, os, shutil, stat, subprocess, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
CODE = os.path.dirname(HERE)
REPO_DIR = os.path.dirname(CODE)
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

def say(*a): print('·', *a, flush=True)

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0: raise RuntimeError(f'{cmd[0]} falhou:\n{r.stdout}\n{r.stderr}')
    return r.stdout

def have(*tools): return all(shutil.which(t) for t in tools)

def zipdir(zpath, items):
    """items: list of (path_on_disk, name_in_zip); folders are walked; executables keep their permission."""
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for disk, name in items:
            if os.path.isdir(disk):
                for root, dirs, files in os.walk(disk):
                    dirs.sort()
                    for f in sorted(files):
                        p = os.path.join(root, f); zipfile_add(z, p, os.path.join(name, os.path.relpath(p, disk)))
            else: zipfile_add(z, disk, name)

def zipfile_add(z, p, name):
    info = zipfile.ZipInfo(name.replace(os.sep, '/'), date_time=datetime.datetime.now().timetuple()[:6])
    mode = os.stat(p).st_mode
    exe = mode & stat.S_IXUSR or name.endswith('.sh') or '/MacOS/' in name.replace(os.sep, '/')   # Windows has no exec bit
    info.external_attr = ((0o755 if exe else 0o644) | stat.S_IFREG) << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    z.writestr(info, open(p, 'rb').read())

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    name = args[0] if args else '2.0'
    parts = [int(x) for x in name.split('.')] + [0, 0]
    ver = parts[0] * 100 + parts[1] * 10 + parts[2] if parts[1] < 10 else parts[0] * 100 + parts[1]
    repo = os.environ.get('RP_REPO', 'Braiantech-br/Reino-Pequeno')
    owner, rname = repo.split('/')
    site_url = f'https://{owner.lower()}.github.io/{rname}/'
    repo_url = f'https://github.com/{repo}'
    notes = f'{HERE}/notas/{name}.txt'
    os.environ.update(RP_VER=str(ver), RP_NAME=name, RP_REPO=repo)
    if os.path.exists(notes): os.environ['RP_NOTES'] = notes
    dist = os.environ.get('RP_DIST', f'{REPO_DIR}/dist')
    shutil.rmtree(dist, ignore_errors=True); os.makedirs(dist)
    work = f'{dist}/.obra'; os.makedirs(work)
    say(f'Reino Pequeno {name} (número {ver})')

    sys.path.insert(0, HERE)
    import build_offline, icone, imagens
    imagens.ensure_assets()
    build_offline.VER, build_offline.NAME, build_offline.REPO = ver, name, repo
    build_offline.UPD_SRC = f'https://raw.githubusercontent.com/{repo}/main/atualizacao/'
    build_offline.NOTES = [l.strip() for l in open(notes, encoding='utf-8')] if os.path.exists(notes) else []
    build_offline.NOTES = [l for l in build_offline.NOTES if l]
    info = build_offline.build(work)
    icons = f'{work}/icones'; os.makedirs(icons)
    rounded, square = icone.master(1024)
    for sz in (512, 192, 180, 256):
        (square if sz == 180 else rounded).resize((sz, sz), icone.Image.LANCZOS).save(f'{icons}/icon-{sz}.png')
    rounded.save(f'{icons}/icon.ico', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    open(f'{icons}/icon.icns', 'wb').write(icone.icns(rounded))
    for f in ('icon-512.png', 'icon-192.png', 'icon-180.png'): shutil.copy(f'{icons}/{f}', f'{work}/site/{f}')

    # the LEIA-ME
    today = datetime.date.today()
    data = f'{today.day} de {MESES[today.month - 1]} de {today.year}'
    notas = '\n'.join('    - ' + l for l in build_offline.NOTES) or '    - Melhorias e correções.'
    leia = open(f'{HERE}/LEIA-ME.txt', encoding='utf-8').read()
    for k, v in {'VERSAO': name, 'DATA': data, 'SITE': site_url, 'REPO_URL': repo_url,
                 'DOWNLOADS': f'{repo_url}/tree/main/downloads', 'NOTAS': notas}.items():
        leia = leia.replace('{{' + k + '}}', v)
    leia = leia.replace('\n', '\r\n')                       # opens right in Windows Notepad too
    open(f'{work}/LEIA-ME.txt', 'w', encoding='utf-8-sig', newline='').write(leia)

    loader = f'{work}/ReinoPequeno.html'
    out = {}
    shutil.copy(loader, f'{dist}/ReinoPequeno-{name}.html'); out['html'] = f'ReinoPequeno-{name}.html'

    # Windows
    if have('x86_64-w64-mingw32-gcc', 'x86_64-w64-mingw32-windres'):
        w = f'{work}/win'; os.makedirs(w)
        c = open(f'{HERE}/windows/reino.c', encoding='utf-8').read().replace('@VERSION_NAME@', name)
        open(f'{w}/reino.c', 'w', encoding='utf-8').write(c)
        rc = open(f'{HERE}/windows/reino.rc', encoding='utf-8').read().replace('@VERSION_NAME@', name)
        for i, n in enumerate((parts + [0, 0, 0])[:3]): rc = rc.replace(f'@V{i + 1}@', str(n))
        open(f'{w}/reino.rc', 'w', encoding='utf-8').write(rc)
        shutil.copy(f'{HERE}/windows/app.manifest', w); shutil.copy(f'{icons}/icon.ico', w); shutil.copy(loader, w)
        run(['x86_64-w64-mingw32-windres', '-c', '65001', 'reino.rc', '-O', 'coff', '-o', 'reino.res'], cwd=w)
        run(['x86_64-w64-mingw32-gcc', '-O2', '-municode', '-mwindows', '-finput-charset=UTF-8', '-o', 'Reino Pequeno.exe', 'reino.c', 'reino.res',
             '-lole32', '-luuid', '-lshell32', '-static'], cwd=w)
        if shutil.which('x86_64-w64-mingw32-strip'): run(['x86_64-w64-mingw32-strip', 'Reino Pequeno.exe'], cwd=w)
        zipdir(f'{dist}/ReinoPequeno-{name}-Windows.zip', [(f'{w}/Reino Pequeno.exe', 'Reino Pequeno.exe'), (f'{work}/LEIA-ME.txt', 'LEIA-ME.txt')])
        out['win'] = f'ReinoPequeno-{name}-Windows.zip'; say('Windows pronto')
    else: say('Windows PULADO: falta o mingw (x86_64-w64-mingw32-gcc)')

    # Mac
    app = f'{work}/mac/Reino Pequeno.app'
    os.makedirs(f'{app}/Contents/MacOS'); os.makedirs(f'{app}/Contents/Resources')
    open(f'{app}/Contents/Info.plist', 'w').write(open(f'{HERE}/mac/Info.plist').read().replace('@VERSION_NAME@', name).replace('@VERSION_CODE@', str(ver)))
    shutil.copy(f'{HERE}/mac/reino', f'{app}/Contents/MacOS/reino'); os.chmod(f'{app}/Contents/MacOS/reino', 0o755)
    shutil.copy(loader, f'{app}/Contents/Resources/ReinoPequeno.html'); shutil.copy(f'{icons}/icon.icns', f'{app}/Contents/Resources/icon.icns')
    open(f'{app}/Contents/PkgInfo', 'w').write('APPL????')
    zipdir(f'{dist}/ReinoPequeno-{name}-Mac.zip', [(app, 'Reino Pequeno.app'), (loader, 'ReinoPequeno.html'), (f'{work}/LEIA-ME.txt', 'LEIA-ME.txt')])
    out['mac'] = f'ReinoPequeno-{name}-Mac.zip'; say('Mac pronto')

    # Linux
    lx = f'{work}/linux/ReinoPequeno'; os.makedirs(lx)
    shutil.copy(f'{HERE}/linux/jogar-linux.sh', lx); os.chmod(f'{lx}/jogar-linux.sh', 0o755)
    shutil.copy(loader, lx); shutil.copy(f'{icons}/icon-256.png', f'{lx}/reino-pequeno.png'); shutil.copy(f'{work}/LEIA-ME.txt', lx)
    zipdir(f'{dist}/ReinoPequeno-{name}-Linux.zip', [(lx, 'ReinoPequeno')])
    out['linux'] = f'ReinoPequeno-{name}-Linux.zip'; say('Linux pronto')

    # iPhone / iPad (the web app files; the easy way is the site itself)
    ios = f'{work}/ios'; os.makedirs(ios)
    for f in ('index.html', 'manifest.webmanifest', 'sw.js', 'icon-512.png', 'icon-192.png', 'icon-180.png'): shutil.copy(f'{work}/site/{f}', ios)
    open(f'{work}/COMO-INSTALAR.txt', 'w', encoding='utf-8-sig', newline='').write(
        f'Reino Pequeno {name} no iPhone e no iPad\r\n\r\nO jeito fácil: abra {site_url} no Safari e toque em\r\nCompartilhar → "Adicionar à Tela de Início". Pronto.\r\n\r\n'
        'Esta pasta traz os mesmos arquivos do site, para hospedar em outro endereço https://\r\n(por exemplo uma pasta do site da Braian Tech). Veja o LEIA-ME.txt.\r\n')
    zipdir(f'{dist}/ReinoPequeno-{name}-iPhone-iPad.zip', [(ios, 'ReinoPequeno-web'), (f'{work}/COMO-INSTALAR.txt', 'COMO-INSTALAR.txt'), (f'{work}/LEIA-ME.txt', 'LEIA-ME.txt')])
    out['ios'] = f'ReinoPequeno-{name}-iPhone-iPad.zip'; say('iPhone/iPad pronto')

    # Android
    ks, kp = os.environ.get('RP_KEYSTORE'), os.environ.get('RP_KEYSTORE_PASS')
    jar = os.environ.get('ANDROID_JAR') or next((p for p in ['/usr/lib/android-sdk/platforms/android-23/android.jar'] +
           sorted([os.path.join(r, 'android.jar') for r, _, fs in os.walk(os.path.expanduser('~/Android/Sdk/platforms')) if 'android.jar' in fs], reverse=True)
           if os.path.exists(p)), None)
    dexer = 'd8' if have('d8') else 'dalvik-exchange' if have('dalvik-exchange') else 'dx' if have('dx') else None
    if not (ks and kp and os.path.exists(ks)):
        say('Android PULADO: informe a chave em RP_KEYSTORE e a senha em RP_KEYSTORE_PASS')
    elif not (jar and dexer and have('aapt', 'javac', 'zipalign', 'apksigner')):
        say('Android PULADO: faltam ferramentas (aapt, javac, d8/dx, zipalign, apksigner, android.jar)')
    else:
        a = f'{work}/android'; os.makedirs(f'{a}/assets'); os.makedirs(f'{a}/classes')
        open(f'{a}/AndroidManifest.xml', 'w').write(open(f'{HERE}/android/AndroidManifest.xml').read().replace('@VERSION_CODE@', str(ver)).replace('@VERSION_NAME@', name))
        for dpi, sz in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
            os.makedirs(f'{a}/res/drawable-{dpi}'); rounded.resize((sz, sz), icone.Image.LANCZOS).save(f'{a}/res/drawable-{dpi}/ic_launcher.png')
        shutil.copy(loader, f'{a}/assets/index.html')
        run(['aapt', 'package', '-f', '-M', 'AndroidManifest.xml', '-S', 'res', '-A', 'assets', '-I', jar, '-F', 'cru.apk'], cwd=a)
        javas = [os.path.join(r, f) for r, _, fs in os.walk(f'{HERE}/android/src') for f in fs if f.endswith('.java')]
        run(['javac', '-nowarn', '-Xlint:-options', '-source', '8', '-target', '8', '-encoding', 'UTF-8', '-bootclasspath', jar, '-d', 'classes'] + javas, cwd=a)
        classes = [os.path.join(r, f) for r, _, fs in os.walk(f'{a}/classes') for f in fs if f.endswith('.class')]
        if dexer == 'd8': run(['d8', '--min-api', '21', '--lib', jar, '--output', '.'] + classes, cwd=a)
        else: run([dexer, '--dex', '--output=classes.dex', 'classes'], cwd=a)
        run(['aapt', 'add', 'cru.apk', 'classes.dex'], cwd=a)
        run(['zipalign', '-f', '4', 'cru.apk', 'alinhado.apk'], cwd=a)
        apk = f'{dist}/ReinoPequeno-{name}-Android.apk'
        run(['apksigner', 'sign', '--ks', ks, '--ks-key-alias', os.environ.get('RP_KEY_ALIAS', 'reino'), '--ks-pass', 'env:RP_KEYSTORE_PASS',
             '--key-pass', 'env:RP_KEYSTORE_PASS', '--out', apk, 'alinhado.apk'], cwd=a)
        run(['apksigner', 'verify', apk])
        if os.path.exists(apk + '.idsig'): os.remove(apk + '.idsig')
        out['android'] = os.path.basename(apk); say('Android pronto')

    # everything together
    full = [(f'{work}/LEIA-ME.txt', 'LEIA-ME.txt'), (loader, 'ReinoPequeno.html')]
    if 'win' in out: full.append((f'{work}/win/Reino Pequeno.exe', 'Windows/Reino Pequeno.exe'))
    full += [(app, 'Mac/Reino Pequeno.app'), (lx, 'Linux'), (ios, 'iPhone-iPad')]
    if 'android' in out: full.append((f'{dist}/{out["android"]}', 'Android/ReinoPequeno.apk'))
    zipdir(f'{dist}/ReinoPequeno-{name}-completo.zip', [(d, f'ReinoPequeno-{name}/{n}') for d, n in full])
    out['full'] = f'ReinoPequeno-{name}-completo.zip'

    # the site goes to the root of the repository (GitHub Pages + update channel)
    shutil.copytree(f'{work}/site', f'{dist}/site')
    shutil.copy(f'{work}/LEIA-ME.txt', f'{dist}/LEIA-ME.txt')
    json.dump({'ver': ver, 'name': name, 'files': out, 'site': site_url, 'repo': repo_url, 'notas': build_offline.NOTES},
              open(f'{dist}/pacotes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    shutil.rmtree(work)
    if '--sem-repo' not in sys.argv:
        for f in os.listdir(f'{dist}/site'):
            src, dst = f'{dist}/site/{f}', f'{REPO_DIR}/{f}'
            if os.path.isdir(src): shutil.rmtree(dst, ignore_errors=True); shutil.copytree(src, dst)
            else: shutil.copy(src, dst)
        shutil.copy(f'{dist}/LEIA-ME.txt', f'{REPO_DIR}/LEIA-ME.txt')
        open(f'{REPO_DIR}/.nojekyll', 'w').close()
        say('site e atualização copiados para a raiz do repositório')
    if '--downloads' in sys.argv:
        # the installers with fixed names in downloads/, so the links in the README never change;
        # the version that was there moves to downloads/old/<version>/ (every old version stays available)
        dl = f'{REPO_DIR}/downloads'; os.makedirs(dl, exist_ok=True)
        prev = None
        try:
            import re as _re
            m = _re.search(r'versão (\d+(?:\.\d+)*)', open(f'{dl}/VERSAO.txt', encoding='utf-8').read()); prev = m and m.group(1)
        except OSError: pass
        olds = [f for f in os.listdir(dl) if os.path.isfile(f'{dl}/{f}')]
        if prev and prev != name and olds:
            od = f'{dl}/old/{prev}'; os.makedirs(od, exist_ok=True)
            for f in olds: shutil.move(f'{dl}/{f}', f'{od}/{f}')
            say(f'versão {prev} guardada em downloads/old/{prev}/')
        for f in [f for f in os.listdir(dl) if os.path.isfile(f'{dl}/{f}')]: os.remove(f'{dl}/{f}')
        oldreadme(dl)
        for k, fixed in [('win', 'ReinoPequeno-Windows.zip'), ('mac', 'ReinoPequeno-Mac.zip'), ('linux', 'ReinoPequeno-Linux.zip'),
                         ('android', 'ReinoPequeno-Android.apk'), ('ios', 'ReinoPequeno-iPhone-iPad.zip')]:
            if k in out: shutil.copy(f'{dist}/{out[k]}', f'{dl}/{fixed}')
        open(f'{dl}/VERSAO.txt', 'w', encoding='utf-8').write(f'Instaladores da versão {name}. Depois de instalado, o jogo se atualiza sozinho pelo botão "Procurar atualização".\n')
        say('instaladores copiados para downloads/')
    say('pronto em', dist)
    for k, f in out.items(): say(f'{f}  {os.path.getsize(f"{dist}/{f}") // 1024} KB')

def oldreadme(dl):
    """downloads/old/LEIA-ME.md: the list of the old versions kept in the repository."""
    od = f'{dl}/old'
    if not os.path.isdir(od): return
    vs = sorted([v for v in os.listdir(od) if os.path.isdir(f'{od}/{v}')], key=lambda v: [int(x) for x in v.split('.') if x.isdigit()], reverse=True)
    rows = []
    for v in vs:
        fs = sorted(f for f in os.listdir(f'{od}/{v}') if f.startswith('ReinoPequeno'))
        rows.append(f'| **{v}** | ' + ' · '.join(f'[{f.replace("ReinoPequeno-", "").rsplit(".", 1)[0].replace("iPhone-iPad", "iPhone e iPad")}]({v}/{f})' for f in fs) + ' |')
    open(f'{od}/LEIA-ME.md', 'w', encoding='utf-8').write(
        '# Versões antigas do Reino Pequeno\n\n'
        'A versão mais nova fica sempre na pasta [downloads](..). Aqui estão as anteriores, caso você precise de alguma delas.\n'
        'Uma versão antiga instalada se atualiza sozinha para a mais nova pelo botão "Procurar atualização"; '
        'se quiser continuar nela, não toque nesse botão.\n\n| Versão | Pacotes |\n|---|---|\n' + '\n'.join(rows) + '\n')

if __name__ == '__main__':
    main()
