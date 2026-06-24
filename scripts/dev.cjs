const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendPkg = path.join(__dirname, '..', 'backend', 'package.json');
const hasBackend = fs.existsSync(backendPkg);

if (!hasBackend) {
  console.log('No backend/ — starting frontend only (client-team workflow).');
  console.log('Set NEXT_PUBLIC_NOBOX_API_ROOT_URL in frontend/.env.local to your API.');
  console.log('Full-stack: npm run backend:clone\n');
  const result = spawnSync('npm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 1);
}

const result = spawnSync(
  'npx',
  [
    'concurrently',
    '-n', 'backend,frontend',
    '-c', 'blue,green',
    'npm run dev:backend',
    'npm run dev:frontend',
  ],
  { stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
