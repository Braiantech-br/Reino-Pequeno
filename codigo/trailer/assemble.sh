#!/bin/bash
# assemble.sh <frames-dir> <out.mp4> [soundtrack.wav] [crf]
# frames at 30 fps + the soundtrack, 2.5 s of black at the end for the last chord
set -e
T="$(cd "$(dirname "$0")" && pwd)"
WAV="${3:-$T/trilha.wav}"; CRF="${4:-24}"
ffmpeg -v error -y -framerate 30 -i "$1/%05d.jpg" -i "$WAV" \
  -vf "tpad=stop_mode=add:stop_duration=2.5:color=black,format=yuv420p" \
  -c:v libx264 -preset slow -crf "$CRF" -profile:v high -r 30 -c:a aac -b:a 192k -movflags +faststart "$2"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact "$2"
