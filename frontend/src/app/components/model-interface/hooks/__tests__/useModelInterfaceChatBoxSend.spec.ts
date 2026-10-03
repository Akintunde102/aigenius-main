import { act, renderHook } from '@testing-library/react';
import { useModelInterfaceChatBoxSend } from '../useModelInterfaceChatBoxSend';
import type { UploadedFileEntry } from '../../ModelInterface.helpers';
import type { ChatMessage, Model } from '../../shared/types';

const model = {
    id: 'model-1',
    name: 'Model',
    description: 'test',
    context_length: 8000,
} as Model;

const uploadedFiles: UploadedFileEntry[] = [
    {
        fileUrl: 'https://cdn.example/a.png',
        isImage: true,
        displayName: 'a.png',
        source: 'local',
    },
    {
        fileUrl: 'https://cdn.example/notes.pdf',
        isImage: false,
        displayName: 'notes.pdf',
        source: 'local',
    },
];

describe('useModelInterfaceChatBoxSend image urls', () => {
    function renderSend(handleSend: jest.Mock) {
        let chat: ChatMessage[] = [];
        let files = uploadedFiles;
        const setChat = jest.fn((action: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
            chat = typeof action === 'function' ? action(chat) : action;
        });
        const setUploadedFiles = jest.fn((
            action: UploadedFileEntry[] | ((prev: UploadedFileEntry[]) => UploadedFileEntry[]),
        ) => {
            files = typeof action === 'function' ? action(files) : action;
        });

        const view = renderHook(() => useModelInterfaceChatBoxSend({
            selectedModel: model,
            uploadedFiles: files,
            project: 'project',
            isInsufficientCredits: false,
            requiredWalletBalance: 1,
            wallet: 100,
            viewSessionId: 'session-1',
            currentSessionId: 'session-1',
            handleSend,
            setChat,
            setUploadedFiles,
            setError: jest.fn(),
            setShowWalletModal: jest.fn(),
        }));

        return {
            view,
            getChat: () => chat,
            getFiles: () => files,
        };
    }

    it('puts hosted urls on the user message and clears the composer when the request starts', async () => {
        const handleSend = jest.fn().mockResolvedValue(true);
        const { view, getChat, getFiles } = renderSend(handleSend);

        await act(async () => {
            await view.result.current('look at these', model);
        });

        expect(getFiles()).toEqual([]);
        expect(getChat()).toHaveLength(1);
        expect(getChat()[0].content).toEqual([
            { type: 'text', text: 'look at these' },
            { type: 'image_url', image_url: { url: 'https://cdn.example/a.png' } },
            { type: 'file_url', file_url: { url: 'https://cdn.example/notes.pdf', name: 'notes.pdf' } },
        ]);
        expect(handleSend).toHaveBeenCalledWith('', undefined, getChat()[0]);
    });

    it('restores the same upload urls when the send is rejected before dispatch', async () => {
        const handleSend = jest.fn().mockResolvedValue(false);
        const { view, getChat, getFiles } = renderSend(handleSend);

        await act(async () => {
            await view.result.current('look at these', model);
        });

        expect(getChat()).toEqual([]);
        expect(getFiles().map((file) => file.fileUrl)).toEqual([
            'https://cdn.example/a.png',
            'https://cdn.example/notes.pdf',
        ]);
    });

    it('keeps the message image urls when a started request later fails', async () => {
        const handleSend = jest.fn().mockResolvedValue(true);
        const { view, getChat, getFiles } = renderSend(handleSend);

        await act(async () => {
            await view.result.current('', model);
        });

        expect(getFiles()).toEqual([]);
        expect(getChat()[0].content).toEqual([
            { type: 'image_url', image_url: { url: 'https://cdn.example/a.png' } },
            { type: 'file_url', file_url: { url: 'https://cdn.example/notes.pdf', name: 'notes.pdf' } },
        ]);
    });
});
