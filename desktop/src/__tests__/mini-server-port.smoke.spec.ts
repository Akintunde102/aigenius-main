/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('mini-server-port smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'mini-server-port.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
