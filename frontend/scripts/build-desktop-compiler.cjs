/**
 * Desktop production build with React Compiler (opt-in).
 * Temporarily enables babel.config.js so normal `next dev` keeps using SWC.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const babelConfig = path.join(root, 'babel.config.js');
const babelCompiler = path.join(root, 'babel.config.compiler.js');
const backup = path.join(root, 'babel.config.js.bak');

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env } });
}

let hadBabel = false;
if (fs.existsSync(babelConfig)) {
  fs.copyFileSync(babelConfig, backup);
  hadBabel = true;
}

fs.copyFileSync(babelCompiler, babelConfig);

try {
  run(
    'cross-env NEXT_PUBLIC_NOBOX_API_ROOT_URL=http://localhost:8000 next build',
  );
} finally {
  if (fs.existsSync(babelConfig)) {
    fs.unlinkSync(babelConfig);
  }
  if (hadBabel && fs.existsSync(backup)) {
    fs.copyFileSync(backup, babelConfig);
    fs.unlinkSync(backup);
  }
}
