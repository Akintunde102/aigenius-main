import {
  buildLocalShellFriendlySurfaceLine,
  buildLocalShellOneLiner,
  folderLabelFromPath,
  plainLanguageShellSummary,
  shellOneLinerVerb,
  shellTerminalPromptParts,
  shortenShellCommand,
} from './local-shell-display.utils';

describe('shortenShellCommand', () => {
  it('collapses whitespace and truncates', () => {
    expect(shortenShellCommand('a  b')).toBe('a b');
    const long = 'x'.repeat(80);
    expect(shortenShellCommand(long).endsWith('…')).toBe(true);
  });
});

describe('folderLabelFromPath', () => {
  it('returns last segment', () => {
    expect(folderLabelFromPath('/home/user/proj')).toBe('proj');
    expect(folderLabelFromPath('C:\\Users\\me\\docs')).toBe('docs');
  });
});

describe('plainLanguageShellSummary', () => {
  it('recognizes common tools', () => {
    expect(plainLanguageShellSummary('npm install')).toBe('Installing dependencies');
    expect(plainLanguageShellSummary('git status')).toBe('Working with your Git repository');
    expect(plainLanguageShellSummary('ls -la')).toBe('Listing folder contents');
  });
});

describe('buildLocalShellFriendlySurfaceLine', () => {
  it('handles missing command', () => {
    expect(buildLocalShellFriendlySurfaceLine({})).toMatch(/no command/i);
  });

  it('includes folder label', () => {
    const s = buildLocalShellFriendlySurfaceLine({
      command: 'npm test',
      cwd: '/Users/me/my-app',
    });
    expect(s).toContain('npm test');
    expect(s).toContain('my-app');
  });
});

describe('shellTerminalPromptParts', () => {
  it('returns null when command and cwd are missing', () => {
    expect(shellTerminalPromptParts({})).toBeNull();
    expect(shellTerminalPromptParts(undefined)).toBeNull();
  });

  it('uses Windows-style separator for drive-letter cwd', () => {
    const p = shellTerminalPromptParts({
      cwd: 'C:\\Users\\me\\proj',
      command: 'npm install',
    });
    expect(p?.cwdDisplay).toBe('C:\\Users\\me\\proj');
    expect(p?.sep).toBe('>');
    expect(p?.commandLine).toBe('npm install');
  });

  it('uses $ for POSIX cwd', () => {
    const p = shellTerminalPromptParts({
      cwd: '/home/user/proj',
      command: 'npm install',
    });
    expect(p?.sep).toBe('$');
    expect(p?.commandLine).toBe('npm install');
  });

  it('falls back cwd display to ~ when only command is set', () => {
    const p = shellTerminalPromptParts({ command: 'whoami' });
    expect(p?.cwdDisplay).toBe('~');
    expect(p?.sep).toBe('$');
  });
});

describe('buildLocalShellOneLiner', () => {
  it('uses verb + your command pattern', () => {
    expect(buildLocalShellOneLiner({ command: 'cd akin && ls' })).toMatch(/your command:/);
    expect(buildLocalShellOneLiner({ command: 'cd akin && ls' })).toContain('cd akin');
  });

  it('picks installing verb for npm install', () => {
    expect(shellOneLinerVerb('npm install')).toBe('Installing');
  });
});
