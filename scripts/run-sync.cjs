const { spawnSync } = require('child_process');

const target = process.argv[2];
const commitMessage = process.argv.slice(3).join(' ');

if (!target || !['frontend', 'backend', 'client'].includes(target)) {
  console.error('Usage: node scripts/run-sync.cjs <frontend|backend|client> [commit message]');
  process.exit(1);
}

if (target === 'client') {
  const { spawnSync: spawn } = require('child_process');
  const args = ['scripts/sync-client.cjs', ...process.argv.slice(3)];
  const result = spawn('node', args, { stdio: 'inherit', shell: false });
  process.exit(result.status ?? 1);
}

if (target === 'backend') {
  const { spawnSync: spawn } = require('child_process');
  const args = ['scripts/sync-backend.cjs', ...process.argv.slice(3)];
  const result = spawn('node', args, { stdio: 'inherit', shell: false });
  process.exit(result.status ?? 1);
}

const isWindows = process.platform === 'win32';
const script = isWindows
  ? `scripts/sync-${target}.ps1`
  : `scripts/sync-${target}.sh`;
const args = isWindows
  ? ['-File', script, ...(commitMessage ? [commitMessage] : [])]
  : [script, ...(commitMessage ? [commitMessage] : [])];
const command = isWindows ? 'powershell' : 'bash';

const result = spawnSync(command, args, { stdio: 'inherit', shell: !isWindows });
process.exit(result.status ?? 1);
