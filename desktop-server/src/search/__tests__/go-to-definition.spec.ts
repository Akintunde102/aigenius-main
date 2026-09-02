import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveGoToDefinition } from '../go-to-definition.js';

describe('resolveGoToDefinition', () => {
  let tmpFile: string;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-to-def-'));
    tmpFile = path.join(dir, 'sample.ts');
    fs.writeFileSync(
      tmpFile,
      [
        'export class Calculator {',
        '  add(value: number): number {',
        '    return value;',
        '  }',
        '}',
        '',
        'const calc = new Calculator();',
        'calc.add(1);',
        '',
      ].join('\n'),
    );
  });

  afterEach(() => {
    fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true });
  });

  it('resolves class definitions without typescript-language-server', async () => {
    const result = await resolveGoToDefinition(tmpFile, 7, 18);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toContain('Definition');
      expect(result.result).toContain('sample.ts:1:');
    }
  });
});
