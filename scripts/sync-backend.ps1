# Sync backend subtree to the standalone backend repository (Azure deploy target).
# Usage: .\scripts\sync-backend.ps1 [commit_message]
#
# One-time setup:
#   git remote add backend-origin https://github.com/Akintunde102/ai-backend.git

param(
    [string]$CommitMsg = "Sync backend updates"
)

$RemoteName = if ($env:BACKEND_REMOTE) { $env:BACKEND_REMOTE } else { "backend-origin" }
$Branch = if ($env:BACKEND_BRANCH) { $env:BACKEND_BRANCH } else { "main" }

$remoteUrl = git remote get-url $RemoteName 2>$null
if (-not $remoteUrl) {
    Write-Host "Remote '$RemoteName' is not configured." -ForegroundColor Red
    Write-Host "Add it once, then re-run:"
    Write-Host "  git remote add $RemoteName https://github.com/Akintunde102/ai-backend.git"
    exit 1
}

Write-Host "Syncing backend to external repository..." -ForegroundColor Cyan

git add .
$staged = git diff --cached --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    git commit -m $CommitMsg
}

git push origin $Branch

Write-Host "Splitting and pushing 'backend/' folder to '$RemoteName'..." -ForegroundColor Green
git subtree push --prefix=backend $RemoteName $Branch

Write-Host "[SUCCESS] Backend sync complete." -ForegroundColor Cyan
