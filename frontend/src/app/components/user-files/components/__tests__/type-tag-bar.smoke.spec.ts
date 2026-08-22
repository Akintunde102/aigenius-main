/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('type-tag-bar smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'type-tag-bar.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
