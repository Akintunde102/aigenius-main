import * as fs from 'fs';
import * as path from 'path';

describe('AttachmentPreviewModal smoke', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'AttachmentPreviewModal.tsx');
    expect(fs.existsSync(source)).toBe(true);
  });
});
