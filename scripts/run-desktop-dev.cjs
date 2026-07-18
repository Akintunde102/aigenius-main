const path = require('path');
const { clientRoot } = require('./lib/resolve-backend.cjs');
const { runNpm } = require('./lib/run.cjs');

const desktopDir = path.join(clientRoot, 'desktop');
const serverDir = path.join(clientRoot, 'desktop-server');

const installCode = runNpm(['install'], desktopDir);
if (installCode !== 0) process.exit(installCode);

const serverInstallCode = runNpm(['install', '--ignore-scripts'], serverDir);
if (serverInstallCode !== 0) process.exit(serverInstallCode);
process.exit(runNpm(['run', 'dev'], desktopDir));
