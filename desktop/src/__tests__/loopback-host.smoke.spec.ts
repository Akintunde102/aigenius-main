/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('loopback-host smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'loopback-host.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
