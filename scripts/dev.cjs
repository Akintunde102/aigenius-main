const path = require('path');
const { resolveBackend, isPlatformCheckout, clientRoot } = require('./lib/resolve-backend.cjs');
const { npmCmd, yarnCmd, spawnDev } = require('./lib/run.cjs');

const backend = resolveBackend();
const frontendDir = path.join(clientRoot, 'frontend');

function bindShutdown(children) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      if (!child.killed) child.kill();
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

function startFrontendOnly() {
  console.log('No backend/ — starting frontend only (client-team workflow).');
  console.log('Set NEXT_PUBLIC_NOBOX_API_ROOT_URL in frontend/.env.local to your API.');
  if (isPlatformCheckout()) {
    console.log('Full-stack (platform): run npm run dev from the aigenius-platform repo root.\n');
  } else {
    console.log('Full-stack: npm run backend:clone\n');
  }

  const child = spawnDev(yarnCmd(), ['dev'], frontendDir);
  child.on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  });
  bindShutdown([child]);
  child.on('exit', (code) => process.exit(code ?? 1));
}

function startFullStack() {
  const backendDir = backend.root;
  const children = [
    spawnDev(npmCmd(), ['run', 'dev'], backendDir),
    spawnDev(yarnCmd(), ['dev'], frontendDir),
  ];

  bindShutdown(children);

  let exitCode = 0;
  let remaining = children.length;
  for (const child of children) {
    child.on('error', (err) => {
      console.error(err.message);
      process.exit(1);
    });
    child.on('exit', (code) => {
      if (code && code !== 0) exitCode = code;
      remaining -= 1;
      if (remaining === 0) process.exit(exitCode);
      else {
        for (const other of children) {
          if (!other.killed && other !== child) other.kill();
        }
      }
    });
  }
}

if (!backend) {
  startFrontendOnly();
} else {
  startFullStack();
}
