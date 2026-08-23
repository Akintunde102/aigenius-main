/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('DocsTextNoFlex smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'DocsTextNoFlex.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
