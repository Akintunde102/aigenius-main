#!/usr/bin/env bash
set -euo pipefail

SANDBOX_PATH="/opt/AIGenius/chrome-sandbox"

if [ -f "$SANDBOX_PATH" ]; then
  chown root:root "$SANDBOX_PATH"
  chmod 4755 "$SANDBOX_PATH"
fi
