/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('ChatErrorMessage smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'ChatErrorMessage.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
