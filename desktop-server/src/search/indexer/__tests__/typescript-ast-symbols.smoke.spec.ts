/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('typescript-ast-symbols smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'typescript-ast-symbols.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
