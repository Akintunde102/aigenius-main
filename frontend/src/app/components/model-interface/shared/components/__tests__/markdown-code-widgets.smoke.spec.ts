/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('markdown-code-widgets smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'markdown-code-widgets.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
