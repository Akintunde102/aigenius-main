'use strict';

const fs = require('fs');
const path = require('path');

function resolveDesktopUiMode() {
  const raw = process.env.AIGENIUS_DESKTOP_UI?.trim().toLowerCase();
  if (raw === 'next') {
    return 'next';
  }
  return 'vite';
}

const desktopRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(desktopRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const mode = resolveDesktopUiMode();

function shouldBundlePythonVenv() {
  const raw = process.env.AIGENIUS_BUNDLE_PYTHON_VENV?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

const shared = [
  {
    from: 'dist-resources/desktop-server',
    to: 'desktop-server',
  },
  {
    from: 'resources',
    to: 'aigenius-desktop-ui',
  },
  {
    from: 'dist-resources/package-runtime.json',
    to: 'package-runtime.json',
  },
];

if (shouldBundlePythonVenv()) {
  shared.splice(2, 0, {
    from: 'dist-resources/python-venv',
    to: 'python-venv',
  });
}

const uiResources =
  mode === 'next'
    ? [
        {
          from: 'dist-resources/next-standalone',
          to: 'next-standalone',
        },
      ]
    : [
        {
          from: 'dist-resources/desktop-ui',
          to: 'desktop-ui',
        },
        {
          from: 'dist-resources/desktop-ui-server',
          to: 'desktop-ui-server',
        },
      ];

pkg.build.extraResources = [...shared.slice(0, 2), ...uiResources, ...shared.slice(2)];
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.info(`[sync-package-extra-resources] desktop UI mode: ${mode}`);
