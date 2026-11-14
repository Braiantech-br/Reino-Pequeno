# Como publicar uma versão nova do Reino Pequeno

Tudo fica neste repositório: **https://github.com/Braiantech-br/Reino-Pequeno**

Os jogos já instalados (Windows, Mac, Linux, Android e o arquivo .html) consultam a pasta `atualizacao/` deste repositório, e o site usa o `index.html` daqui. Ou seja: **publicar uma versão nova é trocar esses arquivos no repositório.** Ninguém precisa baixar o instalador de novo: o jogador toca em *Procurar atualização* e pronto.

---

## Só uma vez: ativar o site (GitHub Pages)

1. Abra https://github.com/Braiantech-br/Reino-Pequeno/settings/pages
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha **main** e a pasta **/ (root)**. Clique em **Save**.
4. Espere 1 ou 2 minutos e abra https://braiantech-br.github.io/Reino-Pequeno/

Esse é o link para jogar on-line e instalar no iPhone.

---

## Caminho 1: pedir para o Claude (o mais fácil)

Numa conversa com o Claude, com este repositório conectado, peça, por exemplo:

> Atualize o Reino Pequeno: *(o que você quer mudar)*. Publique como versão 2.3 no GitHub.

O Claude muda o código em `codigo/src/`, testa, roda o empacotador, coloca o site, a atualização e (se você pedir) os instaladores novos no repositório e envia (*push*). Para gerar o novo APK de Android, ele precisa da chave: anexe o arquivo `chave-android-reino-pequeno.keystore` e informe a senha. Sem a chave, todo o resto é publicado do mesmo jeito; só o APK continua sendo o anterior (o que não é problema: o app de Android se atualiza pelo botão).

---

## Caminho 2: pelo site do GitHub, sem instalar nada

Use este caminho quando você já tiver os arquivos da versão nova (por exemplo, se o Claude enviou a pasta `site` e os downloads).

### a) Trocar o jogo e a atualização

1. Abra https://github.com/Braiantech-br/Reino-Pequeno/upload/main
2. Arraste para a página **todo o conteúdo da pasta `site`**: `index.html`, `manifest.webmanifest`, `sw.js`, os `icon-*.png` e a pasta **`atualizacao`** inteira (com `jogo.html` e `versao.json` dentro). Arraste também o `LEIA-ME.txt` novo.
3. Lá embaixo, em *Commit changes*, escreva algo como `Versão 2.3` e clique em **Commit changes**.

Em 1 ou 2 minutos, o site já abre a versão nova, e os jogos instalados passam a mostrar "Versão 2.3 disponível!".

> Importante: o arquivo `atualizacao/versao.json` é o que avisa os jogos. Ele traz o número da versão (`"ver": 230`) e o código de verificação do `jogo.html` (`"sha256"`). Os dois arquivos precisam ser enviados **juntos**, da mesma montagem. Se só um deles for enviado, o jogo recusa a atualização (por segurança) e continua na versão que tinha.

### b) Trocar os instaladores (opcional)

Os instaladores ficam na pasta `downloads/`, com nomes fixos (`ReinoPequeno-Windows.zip`, `-Mac.zip`, `-Linux.zip`, `-Android.apk`, `-iPhone-iPad.zip`), então os links do README nunca mudam. Só é preciso trocá-los quando você quiser que quem baixa o jogo pela primeira vez já receba a versão nova; quem já instalou se atualiza pelo botão. Para trocar, abra https://github.com/Braiantech-br/Reino-Pequeno/upload/main/downloads, arraste os arquivos novos com esses mesmos nomes e faça *Commit changes*. Antes, se quiser guardar a versão que estava lá, envie os arquivos antigos para `downloads/old/<versão>/` (por exemplo, `downloads/old/2.2/`).

### c) Publicar também como Release (opcional)

O Release é uma página com a lista de versões e os arquivos de cada uma.

1. Abra https://github.com/Braiantech-br/Reino-Pequeno/releases/new
2. Em **Choose a tag**, digite `v2.3` e clique em *Create new tag*.
3. Título: `Reino Pequeno 2.3`. Na descrição, cole as novidades.
4. Arraste os arquivos da pasta `dist`: `ReinoPequeno-2.3-Windows.zip`, `-Mac.zip`, `-Linux.zip`, `-Android.apk`, `-iPhone-iPad.zip`, `ReinoPequeno-2.3.html` e `-completo.zip`.
5. Clique em **Publish release**.

---

## Caminho 3: no seu computador (Windows, Mac ou Linux)

### Preparar (uma vez)

1. Instale o **Git**: https://git-scm.com/downloads
2. Instale o **Python 3**: https://www.python.org/downloads/ (no Windows, marque *Add python.exe to PATH*).
3. No terminal (no Windows: *Prompt de Comando*):
   ```
   pip install pillow
   git clone https://github.com/Braiantech-br/Reino-Pequeno.git
   cd Reino-Pequeno
   ```
   Na primeira vez em que você enviar algo, o Git pede para entrar na sua conta do GitHub.

### Mudar e testar

1. Edite os arquivos em `codigo/src/` (o jogo inteiro está ali).
2. Monte a página de teste e abra-a no navegador:
   ```
   python codigo/build.py
   ```
   Abra `codigo/preview.html`. (Na primeira vez, as imagens são extraídas automaticamente do `atualizacao/jogo.html`.)
3. Testes automáticos da simulação (precisa do Node.js): `node codigo/testes/t_sim1.js`

### Montar e publicar

1. Escreva as novidades, uma por linha, em `codigo/pacotes/notas/2.3.txt` (o número é o da versão nova).
2. Monte tudo:
   ```
   python codigo/pacotes/empacotar.py 2.3
   ```
   Isso cria a pasta `dist/` com todos os downloads e já coloca o site, o `LEIA-ME.txt` e a pasta `atualizacao/` na raiz do repositório. Com `--downloads` no fim, ele também troca os instaladores da pasta `downloads/`, e os que estavam lá vão automaticamente para `downloads/old/<versão>/` (nenhuma versão antiga se perde).
   - O `.exe` do Windows só é montado onde existe o compilador *mingw*, e o APK só onde existem as ferramentas de Android e a chave (`RP_KEYSTORE` e `RP_KEYSTORE_PASS`). Se não existirem, o empacotador pula esses dois e avisa. Não tem problema: os jogos instalados se atualizam pelo botão.
3. Envie:
   ```
   git add -A
   git commit -m "Versão 2.3"
   git push
   ```
4. Se quiser, crie o Release com os arquivos de `dist/` (Caminho 2, item c).

---

## Regras para evitar problemas

- **O número da versão sempre sobe.** 2.0 → 2.0.1 (correção pequena) → 2.1 (novidades) → 3.0 (mudança grande). Os jogos só aceitam uma versão maior do que a que têm. O número interno é calculado automaticamente: 2.0 = 200, 2.0.1 = 201, 2.1 = 210.
- **A chave do Android é secreta e não pode se perder.** Guarde o arquivo `.keystore` e a senha fora do repositório (pendrive, Google Drive particular). Todo APK novo precisa ser assinado com a mesma chave; caso contrário, o Android não instala por cima.
- **Não publique as imagens soltas do Tiny Swords.** O repositório já está configurado para ignorar a pasta `codigo/assets/`; as imagens só vão dentro do jogo pronto.
- Se uma versão sair com defeito, publique a anterior com um número maior (por exemplo, 2.2.1 com o código da 2.1). Quem já atualizou e não consegue abrir o jogo volta sozinho para a versão que veio no pacote.

## Como o jogador atualiza

1. Abre o jogo e, na tela inicial, toca em **Procurar atualização** (o botão fica verde quando há uma versão nova; o jogo também avisa sozinho).
2. Lê as novidades e toca em **Atualizar agora**.
3. O jogo baixa cerca de 3,5 MB, confere o arquivo e reinicia na versão nova. A partida em andamento fica salva.

No site e no iPhone, não é preciso fazer nada: eles sempre abrem a versão mais nova quando há internet.
