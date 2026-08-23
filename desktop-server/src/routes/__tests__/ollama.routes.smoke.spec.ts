/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ollama.routes smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ollama.routes.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
