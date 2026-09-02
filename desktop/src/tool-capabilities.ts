import { spawnSync } from 'child_process';
import { getBundledRipgrepPath, isSystemRipgrepAvailable, selectGrepEngine } from './resolve-ripgrep';

export type LocalToolCapabilities = {
  reportedAtIso: string;
  policy: string;
  grep: {
    engine: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
    bundledRipgrep: boolean;
    systemRipgrep: boolean;
    builtinFallback: boolean;
    recommended: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
  };
  goToDefinition: {
    engine: 'tsmorph';
    languageServerOptional: boolean;
    recommended: 'tsmorph';
  };
  git: {
    available: boolean;
    engine: 'system-git' | 'unavailable';
    recommended: 'system-git' | null;
  };
};

function probeGitAvailable(): boolean {
  const probe = process.platform === 'win32' ? ['where', 'git'] : ['which', 'git'];
  const res = spawnSync(probe[0], [probe[1]], { encoding: 'utf8', windowsHide: true });
  return res.status === 0;
}

function probeLanguageServerAvailable(): boolean {
  const probe = process.platform === 'win32'
    ? ['where', 'typescript-language-server']
    : ['which', 'typescript-language-server'];
  const res = spawnSync(probe[0], [probe[1]], { encoding: 'utf8', windowsHide: true });
  return res.status === 0;
}

export function getLocalToolCapabilities(): LocalToolCapabilities {
  const grep = selectGrepEngine();
  const gitAvailable = probeGitAvailable();

  return {
    reportedAtIso: new Date().toISOString(),
    policy:
      'Check capabilities before choosing a strategy. Prefer bundled > system > built-in. '
      + 'Do not run OS package installs or sudo/runas/npm-global via local_shell (blocked per platform). '
      + 'When install is needed, give copy-paste steps for the user system terminal in chat (apt/brew/winget by OS).',
    grep: {
      engine: grep.engine,
      bundledRipgrep: Boolean(getBundledRipgrepPath()),
      systemRipgrep: isSystemRipgrepAvailable(),
      builtinFallback: true,
      recommended: grep.engine,
    },
    goToDefinition: {
      engine: 'tsmorph',
      languageServerOptional: probeLanguageServerAvailable(),
      recommended: 'tsmorph',
    },
    git: {
      available: gitAvailable,
      engine: gitAvailable ? 'system-git' : 'unavailable',
      recommended: gitAvailable ? 'system-git' : null,
    },
  };
}
