/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('Page smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'Page.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
