const { resolveBackend, isPlatformCheckout } = require('./lib/resolve-backend.cjs');

function ensureBackend() {
  if (resolveBackend()) return true;

  console.error('');
  console.error('backend/ is not present in this clone.');
  console.error('');

  if (isPlatformCheckout()) {
    console.error('You are in an aigenius-platform checkout.');
    console.error('  Initialize backend: git submodule update --init backend');
    console.error('  Then run full-stack dev from repo root: npm run dev');
    console.error('');
    process.exit(1);
  }

  console.error('Which team are you on?');
  console.error('  Client (frontend/desktop): clone only aigenius-main — use npm run dev:frontend');
  console.error('    Point frontend/.env.local at your team API (see frontend/env.example).');
  console.error('  Full-stack: npm run backend:clone  (clones aigenius-backend into backend/)');
  console.error('  Backend-only: clone https://github.com/Akintunde102/aigenius-backend');
  console.error('');
  process.exit(1);
}

if (require.main === module) {
  ensureBackend();
}

module.exports = { ensureBackend };
