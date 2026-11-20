# Trailers do Reino Pequeno

Ferramentas que gravam os trailers diretamente do jogo, quadro a quadro, com o relógio do jogo sob controle.
Os vídeos prontos ficam na pasta [`trailer/`](../../trailer/), na raiz do repositório (os anteriores ficam em `trailer/old/`).

| Trailer | Roteiro | Trilha |
|---|---|---|
| 2.3 — vídeo da atualização: Forja, Conselho de Guerra, dois jogadores, lives (48 s) | `scenes-2.3.js` | `audio-2.3.py` |
| 2.2 — Claude × Claude, modo observador (53 s) | `scenes-2.2.js` | `audio-2.2.py` |
| 2.1 — o Claude comanda o Reino Vermelho (53 s) | `scenes-2.1.js` | `audio-2.1.py` |
| 2.0 — contratos, exército e conquista (61 s) | `scenes-2.0.js` | `audio-2.0.py` |

1. Monte a página de teste: `python codigo/build.py`
2. Coloque as imagens do Tiny Swords em `codigo/assets/` (`python codigo/pacotes/imagens.py` extrai as imagens do jogo publicado).
3. Sirva a pasta `codigo/`: `cd codigo && python -m http.server 8765`.
4. Instale o Playwright (`npm i playwright` e `npx playwright install chromium`).
5. Grave os quadros: `node codigo/trailer/rec.js quadros` (para o vertical: `node codigo/trailer/rec.js quadros_v 1 0 "" 1080 1920`).
   Por padrão grava o roteiro 2.2; para outro: `CENAS=scenes-2.3.js node codigo/trailer/rec.js quadros`.
6. Gere a trilha: `python codigo/trailer/audio-2.2.py trilha.wav` (precisa do numpy e do scipy).
7. Junte tudo com o ffmpeg: `codigo/trailer/assemble.sh quadros ReinoPequeno-2.2-Trailer.mp4 trilha.wav 29`.

Cada `scenes-*.js` traz o roteiro: as cenas, a câmera, as legendas e a duração de cada cena em batidas da música (128 BPM).
Nos trailers 2.1 e 2.2, as ordens, os pensamentos e as provocações do Claude são encenados pelo roteiro (o vídeo não chama a IA). O trailer 2.2 também controla a velocidade do jogo (câmera lenta no choque dos exércitos).
