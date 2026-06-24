#!/bin/sh
set -e
# Host bind for ./backend shadows image files; keep Linux node_modules in a named volume.
if [ ! -d "node_modules/@nestjs/core" ]; then
  echo "[aigenius-backend] Installing npm dependencies (first run or empty volume)…"
  npm install --legacy-peer-deps
  echo "[aigenius-backend] Dependencies ready."
fi
exec "$@"
