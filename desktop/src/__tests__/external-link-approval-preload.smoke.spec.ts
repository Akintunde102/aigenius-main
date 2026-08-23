/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('external-link-approval-preload smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'external-link-approval-preload.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
