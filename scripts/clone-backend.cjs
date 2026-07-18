const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend');
const backendPkg = path.join(backendRoot, 'package.json');
const repoUrl =
  process.env.BACKEND_REPO_URL ||
  'https://github.com/Akintunde102/aigenius-backend.git';

if (fs.existsSync(backendPkg)) {
  console.log('backend/ already exists — nothing to clone.');
  process.exit(0);
}

if (fs.existsSync(backendRoot) && fs.readdirSync(backendRoot).length > 0) {
  console.error('backend/ exists but has no package.json. Remove or empty it, then retry.');
  process.exit(1);
}

console.log(`Cloning ${repoUrl} into backend/ ...`);
const result = spawnSync('git', ['clone', repoUrl, backendRoot], {
  stdio: 'inherit',
  cwd: repoRoot,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('');
console.log('Next steps:');
console.log('  cd backend && npm install');
console.log('  copy env files into backend/env/ (see backend/README.md)');
console.log('  from repo root: npm run dev');
