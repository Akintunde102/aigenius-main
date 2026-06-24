# Sync frontend subtree to the standalone Vercel repository.
# Usage: .\scripts\sync-frontend.ps1 [commit_message]
#
# One-time setup:
#   git remote add frontend-origin https://github.com/Akintunde102/aigenius_frontend.git

param(
    [string]$CommitMsg = "Sync frontend updates"
)

$RemoteName = if ($env:FRONTEND_REMOTE) { $env:FRONTEND_REMOTE } else { "frontend-origin" }
$Branch = if ($env:FRONTEND_BRANCH) { $env:FRONTEND_BRANCH } else { "main" }

$remoteUrl = git remote get-url $RemoteName 2>$null
if (-not $remoteUrl) {
    Write-Host "Remote '$RemoteName' is not configured." -ForegroundColor Red
    Write-Host "Add it once, then re-run:"
    Write-Host "  git remote add $RemoteName https://github.com/Akintunde102/aigenius_frontend.git"
    exit 1
}

Write-Host "Syncing frontend to external repository..." -ForegroundColor Cyan

git add .
$staged = git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    git commit -m $CommitMsg
}

git push origin $Branch

Write-Host "Splitting and pushing 'frontend' folder to '$RemoteName'..." -ForegroundColor Green
git subtree push --prefix=frontend $RemoteName $Branch

Write-Host "[SUCCESS] Frontend sync complete." -ForegroundColor Cyan
