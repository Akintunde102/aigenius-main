'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.join(__dirname, '..');
const candidates = [
  path.join(desktopRoot, 'node_modules', 'typescript', 'lib', 'tsc.js'),
  path.join(desktopRoot, '..', 'node_modules', 'typescript', 'lib', 'tsc.js'),
];

const tscJs = candidates.find((p) => fs.existsSync(p));
if (!tscJs) {
  console.error(
    'TypeScript (typescript package) not found. Install workspace deps from the repo root:\n' +
    '  cd .. && npm install\n' +
    'or from this folder after dependencies exist:\n' +
    '  npm install',
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscJs, '-p', 'tsconfig.json'], {
  cwd: desktopRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

// Copy .sql files from src to dist
if (result.status === 0) {
  const srcSearch = path.join(desktopRoot, 'src', 'search');
  const distSearch = path.join(desktopRoot, 'dist', 'search');
  const schemaFile = 'schema.sql';

  if (fs.existsSync(path.join(srcSearch, schemaFile))) {
    if (!fs.existsSync(distSearch)) {
      fs.mkdirSync(distSearch, { recursive: true });
    }
    fs.copyFileSync(
      path.join(srcSearch, schemaFile),
      path.join(distSearch, schemaFile)
    );
    console.info('Copied schema.sql to dist');
  }

  // Copy models from src to dist
  const srcModels = path.join(desktopRoot, 'src', 'models');
  const distModels = path.join(desktopRoot, 'dist', 'models');
  if (fs.existsSync(srcModels)) {
    if (!fs.existsSync(distModels)) {
      fs.mkdirSync(distModels, { recursive: true });
    }
    const files = fs.readdirSync(srcModels);
    for (const file of files) {
      fs.copyFileSync(path.join(srcModels, file), path.join(distModels, file));
    }
    console.info(`Copied ${files.length} models to dist`);
  }
}

process.exit(result.status === null ? 1 : result.status);
