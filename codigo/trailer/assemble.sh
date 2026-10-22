#!/bin/bash
# assemble.sh <frames-dir> <out.mp4> : frames at 30 fps + the soundtrack, 2.5 s of black at the end for the last chord
set -e
T="$(cd "$(dirname "$0")" && pwd)"
ffmpeg -v error -y -framerate 30 -i "$1/%05d.jpg" -i "$T/trilha.wav" \
  -vf "tpad=stop_mode=add:stop_duration=2.5:color=black,format=yuv420p" \
  -c:v libx264 -preset slow -crf 24 -profile:v high -r 30 -c:a aac -b:a 192k -movflags +faststart "$2"
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact "$2"
