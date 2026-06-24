const fs = require('fs');
const path = require('path');

const backendRoot = path.join(__dirname, '..', 'backend');
const backendPkg = path.join(backendRoot, 'package.json');

if (fs.existsSync(backendPkg)) {
  process.exit(0);
}

console.error('');
console.error('backend/ is not present in this clone.');
console.error('');
console.error('Which team are you on?');
console.error('  Client (frontend/desktop): clone only ai-genius — use npm run dev:frontend');
console.error('    Point frontend/.env.local at your team API (see frontend/env.example).');
console.error('  Full-stack: npm run backend:clone  (clones ai-backend into backend/)');
console.error('  Backend-only: clone https://github.com/Akintunde102/ai-backend — you do not need ai-genius.');
console.error('');
process.exit(1);
