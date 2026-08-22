/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('wallet-pending-payment-poll smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'wallet-pending-payment-poll.ts');
    expect(fs.existsSync(source)).toBe(true);
  });
});
