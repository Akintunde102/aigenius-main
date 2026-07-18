'use strict';

/**
 * Build an isolated Python venv with voice-sidecar deps (faster-whisper, av, …).
 * Packaged apps cannot rely on the developer's global pip install.
 *
 * Usage: node scripts/prepare-python-venv.cjs [platform] [arch]
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(desktopRoot, '..', 'desktop-server');
const platform = (process.argv[2] || process.platform).trim();
const arch = (process.argv[3] || process.arch).trim();
const venvRoot = path.join(serverRoot, 'pack-deps', `python-venv-${platform}-${arch}`);
const venvPython = path.join(venvRoot, 'bin', 'python3');
const requirements = path.join(serverRoot, 'requirements-stt-packaged.txt');
const fullRequirements = path.join(serverRoot, 'requirements-tts.txt');

function resolveSystemPython() {
  const candidates = [
    process.env.AIGENIUS_BUILD_PYTHON,
    'python3',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
  ].filter(Boolean);

  for (const cmd of candidates) {
    const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) {
      return cmd;
    }
  }
  return null;
}

function venvValid() {
  if (!fs.existsSync(venvPython)) {
    return false;
  }
  const check = spawnSync(
    venvPython,
    ['-c', 'import faster_whisper, av'],
    { stdio: 'ignore' },
  );
  return check.status === 0;
}

if (!fs.existsSync(requirements)) {
  console.error(`prepare-python-venv: missing ${requirements}`);
  process.exit(1);
}

if (venvValid()) {
  console.info(`prepare-python-venv: reusing ${venvRoot}`);
  process.exit(0);
}

const systemPython = resolveSystemPython();
if (!systemPython) {
  console.error(
    'prepare-python-venv: python3 not found. Install Python 3 or set AIGENIUS_BUILD_PYTHON.',
  );
  process.exit(1);
}

console.info(`prepare-python-venv: creating venv with ${systemPython} → ${venvRoot}`);
fs.rmSync(venvRoot, { recursive: true, force: true });
execSync(`"${systemPython}" -m venv --copies "${venvRoot}"`, { stdio: 'inherit' });

execSync(`"${venvPython}" -m pip install --upgrade pip`, { stdio: 'inherit' });
console.info(`prepare-python-venv: pip install STT deps (faster-whisper, av)`);
execSync(`"${venvPython}" -m pip install -r "${requirements}"`, {
  stdio: 'inherit',
  cwd: serverRoot,
  env: {
    ...process.env,
    PIP_DISABLE_PIP_VERSION_CHECK: '1',
  },
});

if (fs.existsSync(fullRequirements)) {
  console.info('prepare-python-venv: optional TTS deps from requirements-tts.txt (failures ignored)');
  try {
    execSync(`"${venvPython}" -m pip install -r "${fullRequirements}"`, {
      stdio: 'inherit',
      cwd: serverRoot,
      env: {
        ...process.env,
        PIP_DISABLE_PIP_VERSION_CHECK: '1',
      },
    });
  } catch {
    console.warn('prepare-python-venv: optional TTS deps failed — STT will still work');
  }
}

if (!venvValid()) {
  console.error('prepare-python-venv: validation failed (faster_whisper or av not importable)');
  process.exit(1);
}

console.info(`prepare-python-venv: OK → ${venvRoot}`);
