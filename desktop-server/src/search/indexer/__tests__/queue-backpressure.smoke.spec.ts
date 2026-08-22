/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('queue-backpressure smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'queue-backpressure.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
