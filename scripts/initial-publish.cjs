#!/usr/bin/env node
const { publish, BACKEND_REMOTE, CLIENT_REMOTE } = require('./lib/mirror-repo.cjs');

const branch = process.env.PUBLISH_BRANCH || 'main';

console.log('Publishing clean initial commits to empty child repos...\n');

publish({
  kind: 'backend',
  remoteUrl: BACKEND_REMOTE,
  branch,
  message: 'Initial commit: Nobox Core API (nobox-core)',
  fresh: true,
});

publish({
  kind: 'client',
  remoteUrl: CLIENT_REMOTE,
  branch,
  message: 'Initial commit: AIGenius client monorepo (frontend, desktop, desktop-server)',
  fresh: true,
});

console.log('\nDone. Child repos are ready.');
console.log('This ai-genius repo remains your full-stack integration copy.');
