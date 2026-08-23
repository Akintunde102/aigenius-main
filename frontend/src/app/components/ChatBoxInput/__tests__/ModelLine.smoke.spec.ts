/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ModelLine smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ModelLine.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
