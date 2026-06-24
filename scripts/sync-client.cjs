#!/usr/bin/env node
const { publish, CLIENT_REMOTE } = require('./lib/mirror-repo.cjs');

const message =
  process.argv.slice(2).join(' ') || 'Sync client monorepo from full-stack integration repo';

publish({
  kind: 'client',
  remoteUrl: CLIENT_REMOTE,
  branch: process.env.CLIENT_BRANCH || 'main',
  message,
  fresh: false,
});
