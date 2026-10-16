import { parseAndStripPromptButtons } from '../promptButtons.utils';

describe('parseAndStripPromptButtons', () => {
    it('parses trailing prompt button fence', () => {
        const input = `Answer.

\`\`\`aigenius-prompt-buttons
["Go deeper", "Stop here"]
\`\`\``;

        const { content, promptButtons } = parseAndStripPromptButtons(input);
        expect(content).toBe('Answer.');
        expect(promptButtons).toEqual(['Go deeper', 'Stop here']);
    });

    it('correctly parses CRLF line endings', () => {
        const input = 'Answer.\r\n\r\n```aigenius-prompt-buttons\r\n["Next"]\r\n```\r\n';
        const { content, promptButtons } = parseAndStripPromptButtons(input);
        expect(content).toBe('Answer.');
        expect(promptButtons).toEqual(['Next']);
    });

    it('extracts trailing fence even if an educational fence exists earlier in the body', () => {
        const input = `Here is how you format prompt buttons:
\`\`\`aigenius-prompt-buttons
["Example syntax"]
\`\`\`
Now here is my actual reply.

\`\`\`aigenius-prompt-buttons
["Option A", "Option B"]
\`\`\``;

        const { content, promptButtons } = parseAndStripPromptButtons(input);
        expect(promptButtons).toEqual(['Option A', 'Option B']);
        expect(content).toContain('["Example syntax"]');
    });
});
