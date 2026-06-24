import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageActionsMenu } from '../MessageActionsMenu';

describe('MessageActionsMenu', () => {
    const baseProps = {
        align: 'start' as const,
        msg: {
            id: 'msg-1',
            messageId: 'msg-1',
            role: 'assistant' as const,
            content: 'Hello',
            timestamp: 1,
        },
        idx: 0,
        isSaved: false,
        justSaved: false,
        loading: false,
        streaming: false,
        onDelete: jest.fn(),
        onCopy: jest.fn(),
        onSave: jest.fn(),
        onReplay: jest.fn(),
        onOpenUsageDetails: jest.fn(),
    };

    it('renders side-thread action when provided and invokes the callback', () => {
        const onStartOrphanReply = jest.fn();
        render(
            <MessageActionsMenu
                {...baseProps}
                onStartOrphanReply={onStartOrphanReply}
            />,
        );

        fireEvent.click(screen.getByTitle('Message actions'));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Reply in side thread' }));

        expect(onStartOrphanReply).toHaveBeenCalledTimes(1);
    });
});
