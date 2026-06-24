/* eslint-disable @typescript-eslint/no-explicit-any */
/* global describe, it, expect, jest */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ChatHistoryListItem from '../ChatHistoryListItem';
import { ChatSession } from '@/app/components/model-interface/shared/types';

describe('ChatHistoryListItem', () => {
    const mockSession: ChatSession = {
        id: '1',
        title: 'Test Session',
        messages: [],
        modelId: 'test-model',
        starred: false
    };

    const mockModels = [{ id: 'test-model', name: 'Test Model', description: 'test', context_length: 1 }];

    const defaultProps = {
        session: mockSession,
        isActive: false,
        models: mockModels,
        onSelect: jest.fn(),
        onStarRequest: jest.fn(),
        onDeleteRequest: jest.fn(),
        onPublishRequest: jest.fn(),
        isStarred: false,
    };

    it('calls onSelect when clicked', () => {
        const onSelect = jest.fn();
        const { getByRole } = render(<ChatHistoryListItem {...defaultProps} onSelect={onSelect} />);
        
        fireEvent.click(getByRole('listitem'));
        expect(onSelect).toHaveBeenCalledWith(mockSession);
    });

    it('calls onDeleteRequest when delete button is clicked in dropdown', () => {
        const onDeleteRequest = jest.fn();
        const { getByTitle, getByText } = render(<ChatHistoryListItem {...defaultProps} onDeleteRequest={onDeleteRequest} />);
        
        // Open dropdown first
        const moreBtn = getByTitle(/more actions/i);
        fireEvent.click(moreBtn);
        
        // Click delete in dropdown
        const deleteBtn = getByText(/delete/i);
        fireEvent.click(deleteBtn);
        
        expect(onDeleteRequest).toHaveBeenCalledWith(mockSession);
    });

    it('calls onStarRequest when star button is clicked', () => {
        const onStarRequest = jest.fn();
        const { getByTitle } = render(<ChatHistoryListItem {...defaultProps} onStarRequest={onStarRequest} />);
        
        const starBtn = getByTitle(/star/i);
        fireEvent.click(starBtn);
        
        expect(onStarRequest).toHaveBeenCalledWith(mockSession);
    });

    it('uses the same transition tokens for active and inactive rows', () => {
        const { getByRole, rerender } = render(
            <ChatHistoryListItem {...defaultProps} isActive={false} />,
        );
        let listItem = getByRole('listitem');
        expect(listItem.className).toContain('transition-colors');
        expect(listItem.className).toContain('duration-100');

        rerender(<ChatHistoryListItem {...defaultProps} isActive={true} />);
        listItem = getByRole('listitem');
        expect(listItem.className).toContain('transition-colors');
        expect(listItem.className).toContain('duration-100');
    });
});
