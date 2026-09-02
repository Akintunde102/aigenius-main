import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';

const spawnMock = jest.fn();

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

describe('runGoToDefinition spawn errors', () => {
  let tmpFile: string;

  beforeEach(async () => {
    jest.resetModules();
    spawnMock.mockReset();
    tmpFile = path.join(os.tmpdir(), `local-lsp-test-${Date.now()}.ts`);
    await fs.promises.writeFile(tmpFile, 'export const value = 1;\n');
  });

  afterEach(async () => {
    await fs.promises.unlink(tmpFile).catch(() => undefined);
  });

  it('returns a friendly error when typescript-language-server is missing', async () => {
    spawnMock.mockImplementation(() => {
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        stdin: { write: jest.Mock };
        kill: jest.Mock;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdin = { write: jest.fn() };
      child.kill = jest.fn();
      queueMicrotask(() => {
        child.emit('error', Object.assign(new Error('spawn typescript-language-server ENOENT'), { code: 'ENOENT' }));
      });
      return child;
    });

    const { runGoToDefinition } = await import('../local-lsp');
    const result = await runGoToDefinition({ path: tmpFile, line: 1, character: 1 });

    expect(result).toEqual({
      ok: false,
      error:
        'Advanced TypeScript language-server support is unavailable. Built-in definition lookup failed — try again after adding the project folder to AIGenius.',
    });
  });
});
