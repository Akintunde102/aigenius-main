/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('SidebarLink smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'SidebarLink.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
