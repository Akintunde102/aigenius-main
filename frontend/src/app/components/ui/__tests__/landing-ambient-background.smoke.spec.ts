/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('landing-ambient-background smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'landing-ambient-background.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
