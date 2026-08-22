/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('FileUploadHandler smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'FileUploadHandler.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
