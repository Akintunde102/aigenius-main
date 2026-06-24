#!/usr/bin/env node
const { publish, BACKEND_REMOTE } = require('./lib/mirror-repo.cjs');

const message =
  process.argv.slice(2).join(' ') || 'Sync backend from full-stack integration repo';

publish({
  kind: 'backend',
  remoteUrl: BACKEND_REMOTE,
  branch: process.env.BACKEND_BRANCH || 'main',
  message,
  fresh: false,
});
