#!/bin/bash
# Reino Pequeno for Linux. ./jogar-linux.sh opens the game; ./jogar-linux.sh --instalar puts it in the apps menu.
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}/reino-pequeno"
mkdir -p "$DATA"
SRC="$HERE/ReinoPequeno.html"; DST="$DATA/ReinoPequeno.html"
cmp -s "$SRC" "$DST" || cp "$SRC" "$DST"
if [ "$1" = "--instalar" ]; then
  APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"; mkdir -p "$APPS"
  cp "$HERE/reino-pequeno.png" "$DATA/reino-pequeno.png"
  cp "$0" "$DATA/jogar-linux.sh" 2>/dev/null; cp "$SRC" "$DATA/ReinoPequeno.html"; chmod +x "$DATA/jogar-linux.sh"
  cat > "$APPS/reino-pequeno.desktop" <<DESK
[Desktop Entry]
Type=Application
Name=Reino Pequeno
Comment=Estratégia medieval em tempo real
Exec="$DATA/jogar-linux.sh"
Icon=$DATA/reino-pequeno.png
Terminal=false
Categories=Game;StrategyGame;
DESK
  chmod +x "$APPS/reino-pequeno.desktop"
  echo "Reino Pequeno instalado no menu de aplicativos."
  exit 0
fi
URL="file://$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$DST" 2>/dev/null || printf '%s' "$DST" | sed 's/ /%20/g')"
for b in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge microsoft-edge-stable brave-browser; do
  if command -v "$b" >/dev/null 2>&1; then
    exec "$b" --app="$URL" --user-data-dir="$DATA/navegador" --no-first-run --no-default-browser-check \
      --window-size=1280,800 --autoplay-policy=no-user-gesture-required
  fi
done
xdg-open "$DST" >/dev/null 2>&1 || sensible-browser "$DST" || firefox "$DST"
