# Trailer do Reino Pequeno 2.0

Ferramentas que gravaram o trailer direto do jogo, quadro a quadro, com o relógio do jogo controlado.

1. Monte a página de teste: `python codigo/build.py`
2. Sirva a pasta `codigo/`: `cd codigo && python -m http.server 8765`
3. Instale o Playwright (`npm i playwright` e `npx playwright install chromium`).
4. Grave os quadros: `node codigo/trailer/rec.js quadros` (vertical: `node codigo/trailer/rec.js quadros_v 1 0 "" 1080 1920`)
5. Gere a trilha: `python codigo/trailer/audio.py codigo/trailer/trilha.wav` (precisa de numpy e scipy)
6. Junte com o ffmpeg: `codigo/trailer/assemble.sh quadros ReinoPequeno-Trailer.mp4`

`scenes.js` tem o roteiro: cada cena, a câmera, as legendas e o tempo em batidas da música (128 BPM).
