/** Smoke test — verifies CartoonCapabilityBanner source is tracked */
import * as fs from 'fs';
import * as path from 'path';

describe('CartoonCapabilityBanner smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'CartoonCapabilityBanner.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
