import React from 'react';
import { act, render } from '@testing-library/react';
import { EditableUserBubble } from '../EditableUserBubble';
import { customUpload } from '@/app/components/model-interface/features/file-upload/services';
import type { MessageEditDraft } from '../../utils/messageEdit.utils';
import type { Model } from '@/app/components/model-interface/shared/types';

jest.mock('@/app/components/ChatBoxInput', () => {
    const React = require('react');
    return {
        ChatBoxInput: (props: Record<string, unknown>) => {
            (globalThis as { __editComposerProps?: Record<string, unknown> }).__editComposerProps = props;
            return React.createElement('div', { 'data-testid': 'edit-composer' });
        },
    };
});

jest.mock('@/app/components/model-interface/features/file-upload/services', () => ({
    customUpload: jest.fn(),
}));

const model = {
    id: 'model-1',
    name: 'Model',
    description: 'test',
    context_length: 8000,
} as Model;

type EditComposerProps = {
    onFileUpload: (file: File) => void;
    onRemoveUploadedFile: (index: number) => void;
    uploadedFiles: Array<{ fileUrl: string }>;
};

function composerProps(): EditComposerProps {
    return (globalThis as unknown as { __editComposerProps: EditComposerProps }).__editComposerProps;
}

describe('EditableUserBubble image edits', () => {
    const drafts: MessageEditDraft[] = [];

    beforeEach(() => {
        drafts.length = 0;
        (customUpload as jest.Mock).mockReset();
    });

    function renderBubble(draft: MessageEditDraft) {
        return render(
            <EditableUserBubble
                draft={draft}
                onDraftChange={(next) => {
                    drafts.push(next);
                }}
                onCommit={jest.fn()}
                onCancel={jest.fn()}
                selectedModel={model}
                models={[model]}
            />,
        );
    }

    it('keeps both image urls when two uploads finish before the next render', () => {
        const successes: Array<(result: { fileUrl: string }) => void> = [];
        (customUpload as jest.Mock).mockImplementation(({ onSuccess }) => {
            successes.push(onSuccess);
        });

        renderBubble({ text: 'caption', attachments: [] });

        act(() => {
            composerProps().onFileUpload(new File(['a'], 'a.png', { type: 'image/png' }));
            composerProps().onFileUpload(new File(['b'], 'b.png', { type: 'image/png' }));
            successes[0]({ fileUrl: 'https://cdn.example/a.png' });
            successes[1]({ fileUrl: 'https://cdn.example/b.png' });
        });

        const last = drafts[drafts.length - 1];
        expect(last.attachments.map((item) => item.fileUrl)).toEqual([
            'https://cdn.example/a.png',
            'https://cdn.example/b.png',
        ]);
        expect(last.text).toBe('caption');
    });

    it('does not restore a removed image when a replacement upload finishes', () => {
        let onSuccess: (result: { fileUrl: string }) => void = () => {};
        (customUpload as jest.Mock).mockImplementation((args) => {
            onSuccess = args.onSuccess;
        });

        renderBubble({
            text: '',
            attachments: [
                { fileUrl: 'https://cdn.example/old.png', isImage: true, displayName: 'old.png' },
            ],
        });

        act(() => {
            composerProps().onRemoveUploadedFile(0);
            composerProps().onFileUpload(new File(['n'], 'new.png', { type: 'image/png' }));
            onSuccess({ fileUrl: 'https://cdn.example/new.png' });
        });

        const last = drafts[drafts.length - 1];
        expect(last.attachments.map((item) => item.fileUrl)).toEqual([
            'https://cdn.example/new.png',
        ]);
    });
});
