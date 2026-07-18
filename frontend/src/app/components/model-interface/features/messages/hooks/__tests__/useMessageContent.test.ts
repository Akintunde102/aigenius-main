/**
 * Tests for file message parsing used by useMessageContent.
 * The parsing logic lives in parseFileMessageFromString (lib/utils/messageContentUtils)
 * so we can test it without @testing-library/react.
 */
import { parseFileMessageFromString } from '@/lib/utils/messageContentUtils';

describe('parseFileMessageFromString (file message preview)', () => {
    it('parses plain "fileName: https://..." format as file message', () => {
        const content = 'Cover Letter.pdf: https://res.cloudinary.com/dsph6hnfu/raw/upload/v1770547723/uploads/83f3ce53-1f4b-4775-937e-9baeeeb44585_cover-letter.pdf';
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(true);
        expect(result.fileName).toBe('Cover Letter.pdf');
        expect(result.fileUrl).toBe('https://res.cloudinary.com/dsph6hnfu/raw/upload/v1770547723/uploads/83f3ce53-1f4b-4775-937e-9baeeeb44585_cover-letter.pdf');
    });

    it('parses "**fileName:** https://..." (markdown bold) format as file message', () => {
        const content = '**Cover Letter.pdf:** https://res.cloudinary.com/dsph6hnfu/raw/upload/v1770547723/uploads/83f3ce53-1f4b-4775-937e-9baeeeb44585_cover-letter.pdf';
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(true);
        expect(result.fileName).toBe('Cover Letter.pdf');
        expect(result.fileUrl).toContain('https://res.cloudinary.com');
    });

    it('parses "fileName: http://..." format as file message', () => {
        const content = 'Document.txt: http://example.com/doc.txt';
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(true);
        expect(result.fileName).toBe('Document.txt');
        expect(result.fileUrl).toBe('http://example.com/doc.txt');
    });

    it('does not treat plain text with URL as file message when no "fileName: " prefix', () => {
        const content = 'Check out https://example.com';
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(false);
        expect(result.fileName).toBe('');
        expect(result.fileUrl).toBe('');
    });

    it('parses HTML link format as file message', () => {
        const content = "<a href='https://example.com/doc.pdf'>doc.pdf</a>";
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(true);
        expect(result.fileName).toBe('doc.pdf');
        expect(result.fileUrl).toBe('https://example.com/doc.pdf');
    });

    it('does not treat multiline markdown summary with links as file message', () => {
        const content = `https://www.phpclasses.org/blog/post/1215.html

2. **CoinGecko API** &lt;api@coingecko.com&gt;
   **Snippet/Summary:** Promo text. View: https://www.linkedin.com/comm/messaging/thread/...`;
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(false);
        expect(result.fileName).toBe('');
        expect(result.fileUrl).toBe('');
    });

    it('parses multiline "fileName:\\nhttps://..." attachment references', () => {
        const content = `Owoseni Clinton's Resume.pdf:
https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf`;
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(true);
        expect(result.fileName).toBe("Owoseni Clinton's Resume.pdf");
        expect(result.fileUrl).toBe('https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf');
    });

    it('does not treat label-only URL (e.g. "View: https://...") as file message', () => {
        const content = 'View: https://example.com/path';
        const result = parseFileMessageFromString(content);

        expect(result.isFileMsg).toBe(false);
        expect(result.fileName).toBe('');
        expect(result.fileUrl).toBe('');
    });
});
