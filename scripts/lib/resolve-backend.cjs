const fs = require('fs');
const path = require('path');

const clientRoot = path.join(__dirname, '..', '..');

function resolveBackend() {
  const localPkg = path.join(clientRoot, 'backend', 'package.json');
  if (fs.existsSync(localPkg)) {
    return { root: path.join(clientRoot, 'backend'), layout: 'local' };
  }

  const platformPkg = path.join(clientRoot, '..', 'backend', 'package.json');
  if (fs.existsSync(platformPkg)) {
    return { root: path.join(clientRoot, '..', 'backend'), layout: 'platform' };
  }

  return null;
}

function isPlatformCheckout() {
  return fs.existsSync(path.join(clientRoot, '..', 'package.json')) &&
    fs.existsSync(path.join(clientRoot, '..', '.gitmodules'));
}

module.exports = { clientRoot, resolveBackend, isPlatformCheckout };
