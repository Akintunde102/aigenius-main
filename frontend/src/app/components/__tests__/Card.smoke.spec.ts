/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('Card smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'Card.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
