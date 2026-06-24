import {
  formatCommandForTerminalDisplay,
  parseLocalShellToolResult,
  prettifyResultBlockForTerminal,
} from './local-shell-result.utils';

describe('formatCommandForTerminalDisplay', () => {
  it('breaks at && for readability', () => {
    const out = formatCommandForTerminalDisplay('cd foo && npm test');
    expect(out).toContain('\n');
    expect(out).toContain('&&');
  });
});

describe('parseLocalShellToolResult', () => {
  it('parses wrapped desktop shell JSON', () => {
    const inner = JSON.stringify({ stdout: 'hi\n', stderr: '', exit_code: 0 });
    const p = parseLocalShellToolResult({ result: inner });
    expect(p).not.toBeNull();
    expect(p!.stdout).toBe('hi\n');
    expect(p!.exitCode).toBe(0);
  });

  it('returns null when missing', () => {
    expect(parseLocalShellToolResult(null)).toBeNull();
    expect(parseLocalShellToolResult({})).toBeNull();
  });
});

describe('prettifyResultBlockForTerminal', () => {
  it('pretty-prints inner shell payload', () => {
    const inner = JSON.stringify({ stdout: 'x', stderr: '', exit_code: 0 });
    const text = prettifyResultBlockForTerminal({ result: inner });
    expect(text).toContain('stdout');
    expect(text).toContain('exit_code');
  });
});
