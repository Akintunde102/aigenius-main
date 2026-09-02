import { blockInteractiveShellCommand } from './shell-interactive-block';

describe('blockInteractiveShellCommand', () => {
  describe('linux', () => {
    const platform = 'linux' as const;

    it('blocks sudo apt install', () => {
      const msg = blockInteractiveShellCommand('sudo apt-get install -y git', platform);
      expect(msg).toMatch(/password|sudo/i);
      expect(msg).toMatch(/Terminal/i);
    });

    it('blocks pkexec', () => {
      expect(blockInteractiveShellCommand('pkexec apt update', platform)).not.toBeNull();
    });

    it('blocks apt install without sudo', () => {
      expect(blockInteractiveShellCommand('apt install ripgrep', platform)).not.toBeNull();
    });

    it('allows npm test', () => {
      expect(blockInteractiveShellCommand('npm test', platform)).toBeNull();
    });
  });

  describe('darwin', () => {
    const platform = 'darwin' as const;

    it('blocks sudo', () => {
      expect(blockInteractiveShellCommand('sudo chown root file', platform)).not.toBeNull();
    });

    it('blocks brew install', () => {
      const msg = blockInteractiveShellCommand('brew install git', platform);
      expect(msg).toMatch(/Homebrew/i);
      expect(msg).toMatch(/Terminal/i);
    });

    it('allows local npm install', () => {
      expect(blockInteractiveShellCommand('npm install', platform)).toBeNull();
    });
  });

  describe('win32', () => {
    const platform = 'win32' as const;

    it('blocks runas', () => {
      const msg = blockInteractiveShellCommand('runas /user:Administrator cmd', platform);
      expect(msg).toMatch(/elevation|runas/i);
      expect(msg).toMatch(/PowerShell/i);
    });

    it('blocks winget install', () => {
      const msg = blockInteractiveShellCommand('winget install Git.Git', platform);
      expect(msg).toMatch(/winget/i);
    });

    it('blocks Start-Process RunAs', () => {
      expect(
        blockInteractiveShellCommand(
          'powershell -Command "Start-Process winget -Verb RunAs"',
          platform,
        ),
      ).not.toBeNull();
    });

    it('allows npm test', () => {
      expect(blockInteractiveShellCommand('npm test', platform)).toBeNull();
    });
  });

  describe('all platforms', () => {
    it('blocks global npm install', () => {
      for (const platform of ['linux', 'darwin', 'win32'] as const) {
        expect(blockInteractiveShellCommand('npm i -g typescript', platform)).not.toBeNull();
      }
    });
  });
});
