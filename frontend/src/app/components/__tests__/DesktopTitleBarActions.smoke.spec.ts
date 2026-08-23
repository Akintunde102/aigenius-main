/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('DesktopTitleBarActions smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'DesktopTitleBarActions.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
