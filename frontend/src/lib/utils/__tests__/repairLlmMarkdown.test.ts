import { repairEscapedLocalFileMarkdownLinks, repairLlmMarkdown } from '../repairLlmMarkdown';

describe('repairEscapedLocalFileMarkdownLinks', () => {
    it('unescapes \\[ before local-file markdown links', () => {
        const input =
            'Files in \\[C:\\Users\\dev\\Dami](local-file://C%3A%5CUsers%5Cdev%5CDami%5C)';
        expect(repairEscapedLocalFileMarkdownLinks(input)).toBe(
            'Files in [C:\\Users\\dev\\Dami](local-file://C%3A%5CUsers%5Cdev%5CDami%5C)',
        );
    });

    it('unescapes \\[ before local-file image markdown', () => {
        const input = 'See !\\[shot](local-file://C%3A%5Ctmp%5Cshot.png)';
        expect(repairEscapedLocalFileMarkdownLinks(input)).toBe(
            'See ![shot](local-file://C%3A%5Ctmp%5Cshot.png)',
        );
    });

    it('skips fenced code blocks', () => {
        const input = '```text\n\\[a](local-file://x)\n```\n\\[b](local-file://y)';
        expect(repairEscapedLocalFileMarkdownLinks(input)).toBe(
            '```text\n\\[a](local-file://x)\n```\n[b](local-file://y)',
        );
    });

    it('returns input unchanged when no escaped local-file links', () => {
        const md = 'Open [Dami](local-file://ENCODED) or `C:\\path`';
        expect(repairEscapedLocalFileMarkdownLinks(md)).toBe(md);
    });
});

describe('repairLlmMarkdown', () => {
    it('returns empty input unchanged', () => {
        expect(repairLlmMarkdown('')).toBe('');
    });

    it('does not alter normal markdown outside tables', () => {
        const md = '## Title\n\n**Bold** and `\\n` in prose stays literal.';
        expect(repairLlmMarkdown(md)).toBe(md);
    });

    it('repairs escaped local-file links in prose', () => {
        const md =
            'Files in \\[C:\\Users\\dev\\Dami](local-file://C%3A%5CUsers%5Cdev%5CDami%5C)';
        expect(repairLlmMarkdown(md)).toBe(
            'Files in [C:\\Users\\dev\\Dami](local-file://C%3A%5CUsers%5Cdev%5CDami%5C)',
        );
    });

    it('does not alter a standard GFM table', () => {
        const md = [
            '| ColA | ColB |',
            '| --- | --- |',
            '| v1 | v2 |',
        ].join('\n');
        expect(repairLlmMarkdown(md)).toBe(md);
    });

    it('converts literal \\n in table cells to <br>', () => {
        const md = '| Aspect | Line one\\nLine two |';
        expect(repairLlmMarkdown(md)).toBe('| Aspect | Line one<br>Line two |');
    });

    it('preserves existing <br> tags in table cells', () => {
        const md = '| Arch | StyleTTS 2.<br>• Mel-to-Wave |';
        expect(repairLlmMarkdown(md)).toBe('| Arch | StyleTTS 2.<br>• Mel-to-Wave |');
    });

    it('extracts pseudo-fenced code from a table cell and appends real fences below', () => {
        const md =
            '| **How to run** | ```bash\\npip install kokoro\\n```\\n```python\\nprint("hi")\\n``` |';
        const result = repairLlmMarkdown(md);

        expect(result).toContain('| **How to run** | See example below |');
        expect(result).toContain('```bash\npip install kokoro\n```');
        expect(result).toContain('```python\nprint("hi")\n```');
        expect(result).not.toContain('```bash\\n');
    });

    it('unescapes quotes inside extracted pseudo-fenced code', () => {
        const md = '| Run | ```python\\ntext = \\"Hello\\"\\n``` |';
        const result = repairLlmMarkdown(md);

        expect(result).toContain('text = "Hello"');
        expect(result).not.toContain('\\"');
    });

    it('leaves fenced code outside tables untouched', () => {
        const md = [
            '| Col | val |',
            '| --- | --- |',
            '| a | b |',
            '',
            '```javascript',
            'const x = 1;',
            '```',
        ].join('\n');
        expect(repairLlmMarkdown(md)).toBe(md);
    });
});
