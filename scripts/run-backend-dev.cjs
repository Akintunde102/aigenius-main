const { resolveBackend } = require('./lib/resolve-backend.cjs');
const { runNpm } = require('./lib/run.cjs');
const { ensureBackend } = require('./ensure-backend.cjs');

ensureBackend();

const backend = resolveBackend();
process.exit(runNpm(['run', 'dev'], backend.root));
