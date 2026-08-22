/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('SidebarContent smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'SidebarContent.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
