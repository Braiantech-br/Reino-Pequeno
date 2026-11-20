# Builds the downloadable editions of Reino Pequeno from the source in codigo/:
#   jogo.html          the whole game in one page (sprites and fonts inside); it is also the update file
#   ReinoPequeno.html  the loader: it carries jogo.html inside and runs the newest copy kept on the device
#   site/              the web app for GitHub Pages (play online, install on iPhone/Android/PC) + atualizacao/
# Usage: python3 build_offline.py <out-dir>
# Settings come from the environment: RP_VER (number, 200 = 2.0), RP_NAME ("2.0"), RP_REPO (owner/repo),
# RP_BRANCH (main), RP_NOTES (text file, one change per line).
import base64, datetime, hashlib, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # codigo/
sys.path.insert(0, ROOT)

VER = int(os.environ.get('RP_VER', '200'))
NAME = os.environ.get('RP_NAME', '2.0')
REPO = os.environ.get('RP_REPO', 'Braiantech-br/Reino-Pequeno')
BRANCH = os.environ.get('RP_BRANCH', 'main')
UPD_SRC = f'https://raw.githubusercontent.com/{REPO}/{BRANCH}/atualizacao/'
NOTES = [l.strip(' -•\t') for l in open(os.environ['RP_NOTES'], encoding='utf-8').read().splitlines() if l.strip()] if os.environ.get('RP_NOTES') else []

ORDER = ['core.js', 'ai.js', 'modes.js', 'life.js', 'trade.js', 'towns.js', 'diplo.js', 'army.js', 'scout.js', 'econ.js', 'tactics.js',
         'view.js', 'forge.js', 'music.js', 'voice.js', 'claude.js', 'council.js', 'ui.js']
RNG = {'latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
       'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'}

def b64(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()

def game_body():
    """The game page body (styles + markup + script) with fonts and sprites inside."""
    S = f'{ROOT}/src'
    head = open(f'{S}/head.html', encoding='utf-8').read().replace('/*BASECSS*/', open(f'{S}/base.css', encoding='utf-8').read())
    meta = json.load(open(f'{ROOT}/meta.json'))
    js = '\n'.join(open(f'{S}/{f}', encoding='utf-8').read() for f in ORDER)
    js = js.replace('const META=/*META*/{};', 'const META=' + json.dumps(meta, separators=(',', ':')) + ';')
    css = ''
    for fam, pkg, weights in [('Jersey 10', 'jersey-10', [400]), ('Pixelify Sans', 'pixelify-sans', [400, 600, 700])]:
        for w in weights:
            for sub in ('latin', 'latin-ext'):
                css += (f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;"
                        f"src:url({b64(f'{ROOT}/fontes/{pkg}-{sub}-{w}-normal.woff2', 'font/woff2')}) format('woff2');unicode-range:{RNG[sub]}}}\n")
    head = re.sub(r'<link rel="preconnect"[^>]*>\s*', '', head)
    head = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', lambda m: '<style>\n' + css + '</style>', head)
    assert 'googleapis' not in head and 'gstatic' not in head
    page = head + "\n<script>\n(function(){\n'use strict';\n" + js + "\n})();\n</script>\n"
    assets = {f[:-4]: b64(f'{ROOT}/assets/{f}', 'image/png') for f in sorted(os.listdir(f'{ROOT}/assets')) if f.endswith('.png')}
    page = re.sub(r'assets/\$\{([^}]*)\}\.png', r'${AS(\1)}', page)
    page = re.sub(r"'assets/'\+(\w+)\+'\.png'", r'AS(\1)', page)
    def lit(m):
        k = m.group(1)
        if k not in assets: raise SystemExit('missing sprite ' + k)
        return assets[k]
    page = re.sub(r'assets/([A-Za-z0-9_]+)\.png', lit, page)
    left = re.findall(r'.{30}assets/.{30}', page)
    assert not left, left[:3]
    amap = '<script>window.__A=' + json.dumps(assets, separators=(',', ':')) + ";function AS(k){return window.__A[k]||'';}</script>\n"
    return amap + page

def skeleton(body, extra_head='', src=UPD_SRC, title='Reino Pequeno'):
    ver = (f'<script>window.__RP_VER={VER};window.__RP_NAME={json.dumps(NAME)};window.__RP_SRC={json.dumps(src)};</script>')
    return ('<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
            '<meta name="theme-color" content="#2f6b7a"><meta name="color-scheme" content="light">'
            f'<meta name="description" content="Reino Pequeno {NAME} - estratégia medieval em tempo real">'
            + ver + extra_head +
            '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
            'html,body{margin:0;height:100%;overscroll-behavior:none;touch-action:none;background:#2f6b7a}body{font:14px system-ui}[hidden]{display:none!important}</style>'
            '</head><body>\n' + body + '</body></html>\n')

# The loader runs the newest copy of the game kept on this device (downloaded by "Procurar atualização");
# if that copy failed to start last time, or ?original is in the address, it runs the copy that came in the package.
LOADER = r"""<script>
(function(){
  var BUILT=%(ver)d,done=false,ls=null;
  try{ls=window.localStorage;}catch(e){}
  function get(k){try{return ls?ls.getItem(k):null;}catch(e){return null;}}
  function set(k,v){try{if(ls)ls.setItem(k,v);}catch(e){}}
  function del(k){try{if(ls)ls.removeItem(k);}catch(e){}}
  function builtin(){var t=document.getElementById('rp-game');return t?t.value:'';}
  function run(html,from){
    if(done)return;done=true;
    if(from==='update')html=html.replace('<head>','<head><script>window.__RP_FROM="update";<\/script>');
    document.open();document.write(html);document.close();
  }
  function stored(ver,html){
    if(!(ver>BUILT)||String(ver)===String(bad)||!html||html.indexOf('__RP_VER='+ver+';')<0)return false;
    set('rp.try',String(ver));run(html,'update');return true;
  }
  var bad=get('rp.bad'),tried=get('rp.try');
  // the copy tried last time never finished starting: do not try it again
  if(tried){bad=tried;set('rp.bad',tried);del('rp.try');}
  if(/[?&]original/.test(location.search)){
    del('rp.try');del('rp.bad');
    if(window.AndroidStore){try{AndroidStore.clear();}catch(e){}}
    else try{var d=indexedDB.open('reino-pequeno',1);d.onupgradeneeded=function(){d.result.createObjectStore('kv');};d.onsuccess=function(){try{d.result.transaction('kv','readwrite').objectStore('kv').delete('jogo');}catch(e){}};}catch(e){}
    run(builtin(),'builtin');return;
  }
  if(window.AndroidStore){
    try{var v=+AndroidStore.version();if(v>BUILT&&String(v)!==String(bad)&&stored(v,AndroidStore.load()))return;}catch(e){}
    run(builtin(),'builtin');return;
  }
  setTimeout(function(){if(!done)run(builtin(),'builtin');},5000);
  try{
    var r=indexedDB.open('reino-pequeno',1);
    r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
    r.onerror=function(){run(builtin(),'builtin');};
    r.onsuccess=function(){
      try{var g=r.result.transaction('kv','readonly').objectStore('kv').get('jogo');
        g.onsuccess=function(){var o=g.result;if(!(o&&stored(+o.ver,o.html)))run(builtin(),'builtin');};
        g.onerror=function(){run(builtin(),'builtin');};
      }catch(e){run(builtin(),'builtin');}
    };
  }catch(e){run(builtin(),'builtin');}
})();
</script>"""

def loader(game_html, title='Reino Pequeno'):
    esc = game_html.replace('&', '&amp;').replace('</textarea', '&lt;/textarea')
    return ('<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
            f'<title>{title}</title><meta name="theme-color" content="#2f6b7a">'
            '<style>html,body{margin:0;height:100%;background:#2f6b7a;color:#f6e7c1;font:600 16px system-ui,sans-serif}'
            '#rp-boot{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}</style>'
            '</head><body><div id="rp-boot">Carregando o Reino Pequeno...</div>\n'
            '<textarea id="rp-game" hidden>' + esc + '</textarea>\n' + LOADER % {'ver': VER} + '\n</body></html>\n')

def build(out):
    os.makedirs(out, exist_ok=True)
    body = game_body()
    jogo = skeleton(body)
    open(f'{out}/jogo.html', 'w', encoding='utf-8').write(jogo)
    open(f'{out}/ReinoPequeno.html', 'w', encoding='utf-8').write(loader(jogo))
    # the update channel (atualizacao/ in the repository)
    upd = f'{out}/site/atualizacao'
    os.makedirs(upd, exist_ok=True)
    raw = jogo.encode('utf-8')
    open(f'{upd}/jogo.html', 'wb').write(raw)
    info = {'ver': VER, 'name': NAME, 'date': datetime.date.today().isoformat(), 'file': 'jogo.html',
            'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'notas': NOTES}
    open(f'{upd}/versao.json', 'w', encoding='utf-8').write(json.dumps(info, ensure_ascii=False, indent=1) + '\n')
    # the web app: plays online and installs on any phone or computer; the service worker keeps it offline
    # and always looks for the newest copy first, so it needs no update button
    site = f'{out}/site'
    pwa = ('<link rel="manifest" href="manifest.webmanifest">'
           '<link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-192.png">'
           '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
           '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
           '<meta name="apple-mobile-web-app-title" content="Reino Pequeno"><title>Reino Pequeno</title>'
           "<script>if('serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>")
    open(f'{site}/index.html', 'w', encoding='utf-8').write(skeleton(body, pwa, src=''))
    open(f'{site}/manifest.webmanifest', 'w', encoding='utf-8').write(json.dumps({
        'name': 'Reino Pequeno', 'short_name': 'Reino Pequeno', 'lang': 'pt-BR',
        'description': 'Estratégia medieval: construa, negocie, contrate e defenda o seu reino.',
        'start_url': './index.html', 'scope': './', 'display': 'fullscreen', 'orientation': 'any',
        'background_color': '#2f6b7a', 'theme_color': '#2f6b7a',
        'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                  {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                  {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}, ensure_ascii=False, indent=1))
    open(f'{site}/sw.js', 'w', encoding='utf-8').write(f"""// Reino Pequeno {NAME}: the newest copy when online, the saved copy when offline
const CACHE='reino-{VER}';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));}});
self.addEventListener('fetch',e=>{{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  if(/\\/(trailer|downloads)\\//.test(new URL(r.url).pathname))return;   // videos and installers: straight from the site, never cached
  const page=r.mode==='navigate'||/\\.html$|\\/$/.test(new URL(r.url).pathname);
  if(page){{e.respondWith(fetch(r).then(res=>{{if(res.ok){{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}}return res;}}).catch(()=>caches.match(r,{{ignoreSearch:true}}).then(x=>x||caches.match('./index.html'))));return;}}
  e.respondWith(caches.match(r,{{ignoreSearch:true}}).then(x=>x||fetch(r).then(res=>{{if(res.ok){{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}}return res;}})));
}});
""")
    print('offline build', NAME, f'jogo {len(raw) // 1024} KB', f'loader {os.path.getsize(out + "/ReinoPequeno.html") // 1024} KB')
    return info

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', 'dist'))
