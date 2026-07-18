const { spawn, spawnSync } = require('child_process');

function useShell() {
  return process.platform === 'win32';
}

function npmCmd() {
  return 'npm';
}

function yarnCmd() {
  return 'yarn';
}

function runSync(exe, args, cwd) {
  const result = spawnSync(exe, args, {
    cwd,
    stdio: 'inherit',
    shell: useShell(),
  });
  return result.status ?? 1;
}

function runNpm(args, cwd) {
  return runSync(npmCmd(), args, cwd);
}

function runYarn(args, cwd) {
  return runSync(yarnCmd(), args, cwd);
}

function spawnDev(exe, args, cwd) {
  return spawn(exe, args, {
    cwd,
    stdio: 'inherit',
    shell: useShell(),
  });
}

module.exports = { npmCmd, yarnCmd, runSync, runNpm, runYarn, spawnDev };
