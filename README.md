# Reino Pequeno

Estratégia medieval em tempo real, no estilo Age of Empires, Stronghold e Warcraft. Produzido por **Braian Tech**.

Construa a vila, avance pelas cinco eras, negocie com as vilas neutras, contrate mercenários e heróis, monte o exército com generais e derrube o castelo do Reino Vermelho. Roda no navegador, no computador e no celular, também sem internet.

## Jogar

| Onde | Como |
|---|---|
| **Navegador (qualquer aparelho)** | https://braiantech-br.github.io/Reino-Pequeno/ |
| **iPhone e iPad** | Abra o link acima no Safari → Compartilhar → *Adicionar à Tela de Início* |
| **Windows** | [ReinoPequeno-2.0-Windows.zip](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0-Windows.zip) |
| **Mac** | [ReinoPequeno-2.0-Mac.zip](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0-Mac.zip) |
| **Linux** | [ReinoPequeno-2.0-Linux.zip](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0-Linux.zip) |
| **Android** | [ReinoPequeno-2.0-Android.apk](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0-Android.apk) |
| **Arquivo único** | [ReinoPequeno-2.0.html](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0.html) (abre em qualquer navegador) |
| **Tudo junto** | [ReinoPequeno-2.0-completo.zip](https://github.com/Braiantech-br/Reino-Pequeno/releases/download/v2.0/ReinoPequeno-2.0-completo.zip) |

Todas as versões: [Releases](https://github.com/Braiantech-br/Reino-Pequeno/releases). Instruções de cada sistema, regras e controles: [LEIA-ME.txt](LEIA-ME.txt).

## Novidades da versão 2.0

- **Contratos com as vilas:** mercenários por 5, 10 ou 15 minutos ou até a morte, herói da vila, guarnição, proteção, aliança juramentada e rota fixa. Um mensageiro leva cada proposta a pé; a vila aceita, recusa ou pede mais.
- **Honra:** quem cumpre contratos paga menos; quem quebra, saqueia ou ataca vilas paga mais e é recusado.
- **Tropas de elite e heróis** próprios de cada vila (Guarda de escudo, Machadeiro, Besteiro, Sapador; Mãe Moleira, Tora, Capitã Ourela, Grão-Mineiro).
- **Exército com hierarquia:** o de maior patente comanda, empates vão a voto, grupos com chefes e subchefes, comandos de patente e ordens ao general.
- **Batedores e plano de guerra:** o general estuda o terreno e propõe muralhas, torres no morro, fossos e emboscadas, obra por obra, com o motivo. Espionagem da base inimiga para atacar pelo lado fraco.
- **Névoa de guerra** opcional.
- **Economia interna:** impostos, humor do povo, feira com fama, soldo, caravanas e pedágio.
- **Conquista de vilas,** vassalos, revoltas e leilão. O Reino Vermelho faz tudo isso também, com o engenheiro Mestre Rubro.
- **Conselho:** um lugar só para pedidos, exército, contratos, estradas, economia e regras.

## Atualizações automáticas

As versões baixadas (Windows, Mac, Linux, Android e o arquivo .html) têm o botão **Procurar atualização** na tela inicial. Ele lê [`atualizacao/versao.json`](atualizacao/versao.json) neste repositório e, se houver versão nova, baixa [`atualizacao/jogo.html`](atualizacao/jogo.html), confere a assinatura SHA-256 e passa a usar a versão nova, sem reinstalar. Se a versão nova não abrir, o jogo volta sozinho para a anterior.

O site (GitHub Pages) e o web app do iPhone sempre abrem a versão mais nova quando há internet.

Ou seja: **publicar uma versão nova é só atualizar este repositório.** O passo a passo está em [COMO-ATUALIZAR.md](COMO-ATUALIZAR.md).

## O que tem aqui

```
index.html, manifest.webmanifest, sw.js, icon-*.png   o jogo on-line (GitHub Pages) e o web app
atualizacao/versao.json, atualizacao/jogo.html        o canal de atualização dos jogos baixados
LEIA-ME.txt                                           manual: instalação, regras, controles
COMO-ATUALIZAR.md                                     como publicar uma versão nova
codigo/src/                                           o código do jogo (JavaScript, HTML, CSS)
codigo/build.py                                       monta a página para testar (codigo/preview.html)
codigo/pacotes/empacotar.py                           monta todos os downloads e o site de uma vez
codigo/pacotes/notas/                                 as novidades de cada versão
codigo/testes/                                        testes automáticos da simulação (Node)
codigo/fontes/                                        fontes Jersey 10 e Pixelify Sans (OFL)
```

## Créditos

- Jogo: **Braian Tech** (www.braiantech.com.br)
- Arte: [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords), de Pixel Frog. As imagens ficam só dentro do jogo pronto; elas não são publicadas soltas neste repositório.
- Fontes: Jersey 10 e Pixelify Sans (SIL Open Font License, em `codigo/fontes/`).
- Música e vozes: geradas pelo próprio jogo, no aparelho.
