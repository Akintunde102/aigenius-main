/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('active-editor-context smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'active-editor-context.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
