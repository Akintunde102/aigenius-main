import type { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import {
    buildConversationTranscriptContent,
    buildConversationTranscriptFilename,
    buildConversationTranscriptMessages,
    downloadConversationTranscript,
    extractTranscriptMessage,
} from '../conversationTranscriptExport';

describe('conversationTranscriptExport', () => {
    const exportedAt = new Date('2026-07-26T08:30:00.000Z');

    it('extracts user and assistant text while skipping system messages', () => {
        const messages: ChatMessage[] = [
            { role: 'system', content: 'hidden', timestamp: 1 },
            { role: 'user', content: 'Hello', timestamp: 2 },
            { role: 'assistant', content: 'Hi there', timestamp: 3 },
        ];

        expect(buildConversationTranscriptMessages(messages)).toEqual([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' },
        ]);
    });

    it('includes attachment URLs for multimodal user messages', () => {
        const message: ChatMessage = {
            role: 'user',
            timestamp: 1,
            content: [
                { type: 'text', text: 'See this file' },
                { type: 'file_url', file_url: { url: 'https://example.com/a.pdf', name: 'a.pdf' } },
                { type: 'image_url', image_url: { url: 'https://example.com/image.png' } },
            ],
        };

        expect(extractTranscriptMessage(message)?.content).toBe(
            'See this file\n[File: a.pdf] https://example.com/a.pdf\n[Image: https://example.com/image.png]',
        );
    });

    it('uses only assistant text events and ignores tool/thinking segments', () => {
        const message: ChatMessage = {
            role: 'assistant',
            timestamp: 1,
            content: 'legacy',
            events: [
                { type: 'text', content: 'Visible answer.' },
                {
                    type: 'tool',
                    tool: 'search',
                    displayName: 'Search',
                    arguments: {},
                    logs: [],
                    loading: false,
                    timestamp: 2,
                },
                { type: 'thinking', content: 'hidden thought', loading: false, timestamp: 3 },
                { type: 'text', content: 'More answer.' },
            ],
        };

        expect(extractTranscriptMessage(message)?.content).toBe('Visible answer.\n\nMore answer.');
    });

    it('formats plain text, markdown, and json exports', () => {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Question?', timestamp: 1 },
            { role: 'assistant', content: 'Answer.', timestamp: 2 },
        ];

        const txt = buildConversationTranscriptContent('My Chat', messages, 'txt', exportedAt);
        const md = buildConversationTranscriptContent('My Chat', messages, 'md', exportedAt);
        const json = buildConversationTranscriptContent('My Chat', messages, 'json', exportedAt);

        expect(txt).toContain('Conversation: My Chat');
        expect(txt).toContain('User:\nQuestion?');
        expect(txt).toContain('Assistant:\nAnswer.');

        expect(md).toContain('# My Chat');
        expect(md).toContain('## User');
        expect(md).toContain('## Assistant');

        expect(JSON.parse(json)).toEqual({
            title: 'My Chat',
            exportedAt: exportedAt.toISOString(),
            messages: [
                { role: 'user', content: 'Question?' },
                { role: 'assistant', content: 'Answer.' },
            ],
        });
    });

    it('builds readable filenames with date and short id for generic titles', () => {
        expect(buildConversationTranscriptFilename('My Chat', 'md', 'abcdef123456', exportedAt)).toBe(
            'My-Chat-2026-07-26.md',
        );
        expect(buildConversationTranscriptFilename('Untitled Chat', 'txt', 'abcdef123456', exportedAt)).toBe(
            'chat-abcdef12-2026-07-26.txt',
        );
    });

    it('downloads a blob-backed file in the browser', () => {
        const click = jest.fn();
        const appendChild = jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node);
        const removeChild = jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node);
        const createObjectURL = jest.fn().mockReturnValue('blob:mock');
        const revokeObjectURL = jest.fn();
        const originalUrl = global.URL;

        global.URL = {
            ...originalUrl,
            createObjectURL,
            revokeObjectURL,
        } as unknown as typeof URL;

        const anchor = { click, href: '', download: '' };
        const createElement = jest.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);

        const session: ChatSession = {
            id: 'session-1',
            title: 'Export me',
            modelId: 'model-1',
            messages: [{ role: 'user', content: 'Hi', timestamp: 1 }],
        };

        downloadConversationTranscript(session, 'Export me', 'txt', exportedAt);

        expect(createObjectURL).toHaveBeenCalled();
        expect(anchor.download).toBe('Export-me-2026-07-26.txt');
        expect(click).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

        createElement.mockRestore();
        appendChild.mockRestore();
        removeChild.mockRestore();
        global.URL = originalUrl;
    });
});
