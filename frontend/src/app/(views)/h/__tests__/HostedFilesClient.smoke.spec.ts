/** Smoke test — verifies source is tracked; extend with behavior tests. */
import * as fs from 'fs';
import * as path from 'path';

describe('HostedFilesClient smoke', () => {
    it('source file exists', () => {
        const source = path.join(__dirname, '..', 'components', 'HostedFilesClient.tsx');
        expect(fs.existsSync(source)).toBe(true);
    });

    it('publish markdown modal file exists', () => {
        const source = path.join(__dirname, '..', 'components', 'PublishMarkdownModal.tsx');
        expect(fs.existsSync(source)).toBe(true);
    });
});
