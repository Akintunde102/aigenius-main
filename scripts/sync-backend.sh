#!/bin/bash
# Sync backend subtree to the standalone backend repository (Azure deploy target).
# Usage: ./scripts/sync-backend.sh "commit message"
#
# One-time setup:
#   git remote add backend-origin https://github.com/Akintunde102/ai-backend.git

set -euo pipefail

COMMIT_MSG=${1:-"Sync backend updates"}
REMOTE_NAME=${BACKEND_REMOTE:-backend-origin}
BRANCH=${BACKEND_BRANCH:-main}

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Remote '$REMOTE_NAME' is not configured."
  echo "Add it once, then re-run:"
  echo "  git remote add $REMOTE_NAME https://github.com/Akintunde102/ai-backend.git"
  exit 1
fi

echo -e "\033[0;36m🚀 Syncing backend to external repository...\033[0m"

git add .
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
fi

git push origin "$BRANCH"

echo -e "\033[0;32m📤 Splitting and pushing 'backend/' folder to '$REMOTE_NAME'...\033[0m"
git subtree push --prefix=backend "$REMOTE_NAME" "$BRANCH"

echo -e "\033[0;36m✅ Done! Backend CI should be building now.\033[0m"
