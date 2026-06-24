#!/bin/bash
# Sync frontend subtree to the standalone Vercel repository.
# Usage: ./scripts/sync-frontend.sh "commit message"
#
# One-time setup:
#   git remote add frontend-origin https://github.com/Akintunde102/aigenius_frontend.git

set -euo pipefail

COMMIT_MSG=${1:-"Sync frontend updates"}
REMOTE_NAME=${FRONTEND_REMOTE:-frontend-origin}
BRANCH=${FRONTEND_BRANCH:-main}

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Remote '$REMOTE_NAME' is not configured."
  echo "Add it once, then re-run:"
  echo "  git remote add $REMOTE_NAME https://github.com/Akintunde102/aigenius_frontend.git"
  exit 1
fi

echo -e "\033[0;36m🚀 Syncing frontend to external repository...\033[0m"

git add .
if ! git diff --cached --quiet; then
  git commit -m "$COMMIT_MSG"
fi

git push origin "$BRANCH"

echo -e "\033[0;32m📤 Splitting and pushing 'frontend' folder to '$REMOTE_NAME'...\033[0m"
git subtree push --prefix=frontend "$REMOTE_NAME" "$BRANCH"

echo -e "\033[0;36m✅ Done! Vercel should be building now.\033[0m"
