/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('markdown-renderer-components smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'markdown-renderer-components.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
