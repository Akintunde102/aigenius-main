import React from 'react';
import { act } from '@testing-library/react';
import { createRoot, Root } from 'react-dom/client';
import { useMessageContent } from '../useMessageContent';

describe('useMessageContent hook integration', () => {
    let container: HTMLDivElement;
    let root: Root;
    let resultRef: { current: ReturnType<typeof useMessageContent> | null };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        resultRef = { current: null };
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    function renderWithContent(content: unknown) {
        function Wrapper() {
            resultRef.current = useMessageContent(content);
            return null;
        }

        root = createRoot(container);
        act(() => {
            root.render(React.createElement(Wrapper));
        });
    }

    it('classifies plain file-style strings as file messages', () => {
        renderWithContent('Proposal.pdf: https://example.com/files/proposal.pdf');

        expect(resultRef.current?.isFileMsg).toBe(true);
        expect(resultRef.current?.fileName).toBe('Proposal.pdf');
        expect(resultRef.current?.fileUrl).toBe('https://example.com/files/proposal.pdf');
    });

    it('classifies markdown-bold file strings as file messages', () => {
        renderWithContent('**Proposal.pdf:** https://example.com/files/proposal.pdf');

        expect(resultRef.current?.isFileMsg).toBe(true);
        expect(resultRef.current?.fileName).toBe('Proposal.pdf');
    });

    it('classifies html anchor strings as file messages', () => {
        renderWithContent("<a href='https://example.com/files/proposal.pdf'>Proposal.pdf</a>");

        expect(resultRef.current?.isFileMsg).toBe(true);
        expect(resultRef.current?.fileName).toBe('Proposal.pdf');
        expect(resultRef.current?.fileUrl).toBe('https://example.com/files/proposal.pdf');
    });

    it('classifies audio structured content as audio messages', () => {
        renderWithContent([
            {
                type: 'input_audio',
                input_audio: { data: 'ZmFrZQ==', format: 'mp3' },
            },
        ]);

        expect(resultRef.current?.isAudioMsg).toBe(true);
        expect(resultRef.current?.fileName).toBe('audio.mp3');
        expect(resultRef.current?.fileUrl).toContain('data:audio/mp3;base64,');
    });
});
