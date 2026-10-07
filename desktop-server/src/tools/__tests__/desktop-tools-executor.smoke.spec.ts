import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { executeDesktopTool } from '../desktop-tools-executor';

jest.mock('../../search/pdf-text-extract.js', () => ({
  readPdfText: jest.fn().mockResolvedValue({
    content: 'Extracted PDF invoice text layer',
    method: 'text',
  }),
}));

describe('desktop-tools-executor', () => {
  it('source file exists', () => {
    const source = path.join(__dirname, '..', 'desktop-tools-executor.ts');
    expect(fs.existsSync(source)).toBe(true);
  });

  it(
    'extracts PDF text when local_read_file is executed on a PDF file',
    async () => {
    const tempPdf = path.join(os.tmpdir(), `test-sidecar-${Date.now()}.pdf`);
    await fs.promises.writeFile(tempPdf, '%PDF-1.4');

    try {
      const res = await executeDesktopTool('local_read_file', { path: tempPdf });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.result).toContain('Text extracted from PDF document');
        expect(res.result).toContain('Extracted PDF invoice text layer');
      }
    } finally {
      await fs.promises.unlink(tempPdf).catch(() => undefined);
    }
  },
    20_000,
  );

  it('rejects binary file with unsupported type error when local_read_file is called', async () => {
    const tempBin = path.join(os.tmpdir(), `test-sidecar-${Date.now()}.bin`);
    const binData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00, 0xff]);
    await fs.promises.writeFile(tempBin, binData);

    try {
      const res = await executeDesktopTool('local_read_file', { path: tempBin });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain('unsupported file type');
        expect(res.error).toContain('binary');
      }
    } finally {
      await fs.promises.unlink(tempBin).catch(() => undefined);
    }
  });
});
