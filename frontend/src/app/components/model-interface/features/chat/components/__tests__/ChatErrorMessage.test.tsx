import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatErrorMessage } from '../ChatErrorMessage';
import { CHAT_UI_ERRORS } from '../../hooks/chatUiError';

describe('ChatErrorMessage', () => {
    it('shows a title, cause, and matching retry label for send failures', () => {
        const onRetry = jest.fn();
        render(
            <ChatErrorMessage
                error={CHAT_UI_ERRORS.rateLimit}
                canRetry
                onRetry={onRetry}
                onDismiss={jest.fn()}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('The model is busy');
        expect(screen.getByRole('alert')).toHaveTextContent('Too many requests right now');
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('hides retry when the error is not recoverable by resending', () => {
        render(
            <ChatErrorMessage
                error={CHAT_UI_ERRORS.conversationMissing}
                canRetry
                onRetry={jest.fn()}
                onDismiss={jest.fn()}
            />,
        );

        expect(screen.getByText('Chat not found')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dismiss error' })).toBeInTheDocument();
    });
});
