#!/bin/sh
set -e
cd /repo
if [ ! -d "node_modules/next" ]; then
  echo "[aigenius-frontend] Installing yarn workspace dependencies (first run or empty volume)…"
  yarn install --frozen-lockfile --ignore-scripts
  echo "[aigenius-frontend] Dependencies ready."
fi
cd frontend
exec "$@"
