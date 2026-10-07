'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');

// 1. Files that require native shell upgrade / Store submission
const NATIVE_PATTERNS = [
  /^client\/desktop\/src\/(?!desktop-ui-ota)/,
  /^desktop\/src\/(?!desktop-ui-ota)/,
  /^client\/desktop-server\//,
  /^desktop-server\//,
  /^client\/desktop\/package\.json/,
  /^desktop\/package\.json/,
  /\.node$/,
  /\.rs$/,
  /\.c$/,
  /\.cpp$/,
  /\.py$/,
];

// 2. Resolve diff base (e.g., against previous tag, origin/main, or HEAD~1)
function getChangedFiles(baseRef) {
  let target = baseRef;
  if (!target) {
    // Check if there is a previous git tag
    const tagRes = spawnSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
    if (tagRes.status === 0 && tagRes.stdout.trim()) {
      target = tagRes.stdout.trim();
    } else {
      target = 'HEAD~1';
    }
  }

  console.info(`[auto-detect-release] Comparing changes against: ${target}`);
  const diffRes = spawnSync('git', ['diff', '--name-only', target, 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  if (diffRes.status !== 0 || !diffRes.stdout.trim()) {
    // Fallback: check status of unstaged/staged files
    const statusRes = spawnSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
    if (statusRes.status === 0 && statusRes.stdout.trim()) {
      return statusRes.stdout
        .trim()
        .split('\n')
        .map((line) => line.slice(3).trim());
    }
    return [];
  }

  return diffRes.stdout.trim().split('\n');
}

// 3. Resolve the baseline native desktop version
function getLastNativeVersion() {
  const desktopPkg = JSON.parse(
    fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'),
  );
  return desktopPkg.version || '1.0.0';
}

function analyzeChanges(changedFiles) {
  const nativeChanged = [];
  const uiChanged = [];

  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, '/');
    const isNative = NATIVE_PATTERNS.some((pattern) => pattern.test(normalized));

    if (isNative) {
      nativeChanged.push(normalized);
    } else {
      uiChanged.push(normalized);
    }
  }

  const currentDesktopVersion = getLastNativeVersion();

  if (nativeChanged.length > 0) {
    return {
      releaseType: 'NATIVE_REQUIRED',
      reason: `Found ${nativeChanged.length} modified native files`,
      nativeFiles: nativeChanged,
      minDesktopVersion: currentDesktopVersion,
      requiresStoreSubmission: true,
    };
  }

  return {
    releaseType: 'UI_OTA',
    reason: `Only UI/renderer files changed (${uiChanged.length} files)`,
    nativeFiles: [],
    // For pure UI, keep minDesktopVersion at the baseline so all existing users get it
    minDesktopVersion: currentDesktopVersion,
    requiresStoreSubmission: false,
  };
}

const args = process.argv.slice(2);
const baseRef = args[0];
const changed = getChangedFiles(baseRef);
const decision = analyzeChanges(changed);

console.info('\n═════════════════════════════════════════════════════');
console.info(`  RELEASE DECISION: ${decision.releaseType}`);
console.info(`  Reason:           ${decision.reason}`);
console.info(`  Min Shell Req:    ${decision.minDesktopVersion}`);
console.info(`  Store Submit:     ${decision.requiresStoreSubmission ? 'YES' : 'NO (Silent OTA)'}`);
console.info('═════════════════════════════════════════════════════\n');

if (decision.nativeFiles.length > 0) {
  console.info('Native files that triggered this:');
  decision.nativeFiles.slice(0, 10).forEach((f) => console.info(`  • ${f}`));
  if (decision.nativeFiles.length > 10) {
    console.info(`  ... and ${decision.nativeFiles.length - 10} more`);
  }
}

// Export to GitHub Actions environment if running in CI
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `release_type=${decision.releaseType}\n` +
      `min_desktop_version=${decision.minDesktopVersion}\n` +
      `requires_store_submission=${decision.requiresStoreSubmission}\n`,
  );
}

module.exports = { analyzeChanges, getChangedFiles };
