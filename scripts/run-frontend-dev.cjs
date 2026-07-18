const path = require('path');
const { clientRoot } = require('./lib/resolve-backend.cjs');
const { runYarn } = require('./lib/run.cjs');

process.exit(runYarn(['dev'], path.join(clientRoot, 'frontend')));
