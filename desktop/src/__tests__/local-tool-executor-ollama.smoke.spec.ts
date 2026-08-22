/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('local-tool-executor-ollama smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'local-tool-executor-ollama.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
