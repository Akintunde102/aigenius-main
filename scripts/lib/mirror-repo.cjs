const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');

const DEFAULT_EXCLUDES = new Set([
  '.git',
  '.publish',
  'backend',
  'node_modules',
  '.next',
  'out',
  'dist',
  'build',
  'target',
  'venv',
  '.venv',
  '__pycache__',
  '.env',
  '.env.deploy',
  'coverage',
  '.vercel',
  '.yarn',
  'scratch',
]);

const BACKEND_SOURCE_EXCLUDES = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.env',
  '.env.deploy',
]);

function readGhToken() {
  const fromEnv = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (fromEnv) return fromEnv.trim();

  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('No GH token. Set GH_TOKEN or add it to repo-root .env');
  }
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!line) throw new Error('.env is empty — add your GitHub token on one line');
  return line;
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd,
    stdio: options.stdio ?? 'inherit',
    shell: options.shell ?? false,
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${cmd} ${args.join(' ')}), exit ${result.status}`);
  }
  return result;
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function shouldSkip(name, excludes) {
  return excludes.has(name);
}

function copyTree(src, dest, excludes) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (shouldSkip(entry, excludes)) continue;
      copyTree(path.join(src, entry), path.join(dest, entry), excludes);
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyBackendInto(dest) {
  rmrf(dest);
  fs.mkdirSync(dest, { recursive: true });
  copyTree(path.join(REPO_ROOT, 'backend'), dest, BACKEND_SOURCE_EXCLUDES);
}

function copyClientMonorepoInto(dest) {
  rmrf(dest);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(REPO_ROOT)) {
    if (shouldSkip(entry, DEFAULT_EXCLUDES)) continue;
    copyTree(path.join(REPO_ROOT, entry), path.join(dest, entry), DEFAULT_EXCLUDES);
  }
}

function authRemoteUrl(remoteUrl, token) {
  const url = new URL(remoteUrl);
  url.username = 'x-access-token';
  url.password = token;
  return url.toString();
}

function gitCommitAll(workDir, message) {
  run('git', ['add', '-A'], { cwd: workDir });
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], {
    cwd: workDir,
    stdio: 'ignore',
  });
  if (diff.status === 0) {
    console.log('No changes to commit.');
    return false;
  }
  run('git', ['commit', '-m', message], { cwd: workDir });
  return true;
}

function ensureGitRepo(workDir, branch, remoteUrl, token, { fresh }) {
  if (fresh) {
    rmrf(workDir);
    fs.mkdirSync(workDir, { recursive: true });
    run('git', ['init', '-b', branch], { cwd: workDir });
    run('git', ['remote', 'add', 'origin', authRemoteUrl(remoteUrl, token)], { cwd: workDir });
    return;
  }

  if (!fs.existsSync(path.join(workDir, '.git'))) {
    fs.mkdirSync(workDir, { recursive: true });
    run('git', ['init', '-b', branch], { cwd: workDir });
    run('git', ['remote', 'add', 'origin', authRemoteUrl(remoteUrl, token)], { cwd: workDir });
    const pull = spawnSync('git', ['pull', 'origin', branch, '--allow-unrelated-histories'], {
      cwd: workDir,
      stdio: 'inherit',
    });
    if (pull.status !== 0) {
      const fetch = spawnSync('git', ['fetch', 'origin', branch], { cwd: workDir, stdio: 'inherit' });
      if (fetch.status === 0) {
        run('git', ['checkout', '-B', branch, `origin/${branch}`], { cwd: workDir });
      }
    }
    return;
  }

  run('git', ['remote', 'set-url', 'origin', authRemoteUrl(remoteUrl, token)], { cwd: workDir });
  const fetch = spawnSync('git', ['fetch', 'origin', branch], { cwd: workDir, stdio: 'inherit' });
  if (fetch.status === 0) {
    run('git', ['checkout', branch], { cwd: workDir });
    const pull = spawnSync('git', ['pull', '--rebase', 'origin', branch], { cwd: workDir, stdio: 'inherit' });
    if (pull.status !== 0) {
      run('git', ['reset', '--hard', `origin/${branch}`], { cwd: workDir });
    }
  } else {
    run('git', ['checkout', '-B', branch], { cwd: workDir });
  }
}

function replaceWorktreeContents(workDir, staging) {
  for (const entry of fs.readdirSync(workDir)) {
    if (entry === '.git') continue;
    rmrf(path.join(workDir, entry));
  }
  for (const entry of fs.readdirSync(staging)) {
    fs.renameSync(path.join(staging, entry), path.join(workDir, entry));
  }
  rmrf(staging);
}

function publish({ kind, remoteUrl, branch, message, fresh }) {
  const token = readGhToken();
  const workDir = path.join(REPO_ROOT, '.publish', kind === 'backend' ? 'ai-backend' : 'aigenius-main');
  const staging = path.join(REPO_ROOT, '.publish', `.staging-${kind}`);

  ensureGitRepo(workDir, branch, remoteUrl, token, { fresh });

  if (kind === 'backend') {
    copyBackendInto(staging);
  } else {
    copyClientMonorepoInto(staging);
  }

  replaceWorktreeContents(workDir, staging);

  const committed = gitCommitAll(workDir, message);
  if (committed || fresh) {
    run('git', ['push', '-u', 'origin', branch], { cwd: workDir });
  } else {
    console.log('Nothing new to push.');
  }

  console.log(`Published ${kind} → ${remoteUrl} (${branch})`);
}

module.exports = {
  publish,
  REPO_ROOT,
  BACKEND_REMOTE: 'https://github.com/Akintunde102/ai-backend.git',
  CLIENT_REMOTE: 'https://github.com/Akintunde102/aigenius-main.git',
};
