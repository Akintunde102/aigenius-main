import { blockInteractiveShellCommand } from '../shell-interactive-block.js';

describe('blockInteractiveShellCommand (sidecar)', () => {
  it('blocks linux apt and win32 winget', () => {
    expect(blockInteractiveShellCommand('apt install git', 'linux')).not.toBeNull();
    expect(blockInteractiveShellCommand('winget install Git.Git', 'win32')).not.toBeNull();
    expect(blockInteractiveShellCommand('brew install git', 'darwin')).not.toBeNull();
  });
});
