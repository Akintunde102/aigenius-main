/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('voiceObservability smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'voiceObservability.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
