/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('tree-sitter-bridge smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'tree-sitter-bridge.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
