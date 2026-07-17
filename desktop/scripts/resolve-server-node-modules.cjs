'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Resolve which desktop-server node_modules tree to bundle.
 * - Default: ../desktop-server/node_modules (host / same-platform packages)
 * - AIGENIUS_SERVER_NODE_MODULES: explicit path
 * - AIGENIUS_PACKAGE_PLATFORM + AIGENIUS_PACKAGE_ARCH: pack-deps/<platform>-<arch>/node_modules
 */
function resolveServerNodeModules(desktopRoot) {
  const explicit = process.env.AIGENIUS_SERVER_NODE_MODULES?.trim();
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!fs.existsSync(resolved)) {
      throw new Error(`AIGENIUS_SERVER_NODE_MODULES not found: ${resolved}`);
    }
    return resolved;
  }

  const platform = process.env.AIGENIUS_PACKAGE_PLATFORM?.trim();
  const arch = process.env.AIGENIUS_PACKAGE_ARCH?.trim();
  if (platform && arch) {
    const packed = path.resolve(
      desktopRoot,
      '..',
      'desktop-server',
      'pack-deps',
      `${platform}-${arch}`,
      'node_modules',
    );
    if (!fs.existsSync(packed)) {
      throw new Error(
        `Packed server deps missing for ${platform}-${arch}. Run:\n` +
          `  npm run install:server-deps:${platform}${arch === 'x64' ? '' : ` -- ${platform} ${arch}`}`,
      );
    }
    return packed;
  }

  const hostPacked = path.resolve(
    desktopRoot,
    '..',
    'desktop-server',
    'pack-deps',
    `${process.platform}-${process.arch}`,
    'node_modules',
  );
  if (fs.existsSync(hostPacked)) {
    return hostPacked;
  }

  const defaultMods = path.resolve(desktopRoot, '..', 'desktop-server', 'node_modules');
  if (!fs.existsSync(defaultMods)) {
    throw new Error('Missing desktop-server/node_modules. Run: cd desktop-server && npm install');
  }
  return defaultMods;
}

module.exports = { resolveServerNodeModules };
