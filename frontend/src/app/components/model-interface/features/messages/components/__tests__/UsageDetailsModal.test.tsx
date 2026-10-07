import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UsageDetailsModal } from '../UsageDetailsModal';
import type { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';

describe('UsageDetailsModal', () => {
    const baseMsg: ChatMessageType = {
        role: 'assistant',
        content: 'Video started',
        timestamp: 1,
        cost_credits: 600,
        tool_usage_charges: [],
    };

    it('shows generate_video as reserved in the tools breakdown', async () => {
        render(
            <UsageDetailsModal
                showUsageDetails
                setShowUsageDetails={() => undefined}
                streaming={false}
                msg={{
                    ...baseMsg,
                    tool_usage_charges: [{
                        tool: 'generate_video',
                        display_name: 'Generate Video',
                        cost_credits: 600,
                        status: 'reserved',
                        reserved_credits: 600,
                        reserved_at: 1_790_945_504_282,
                    }],
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Token usage' })).toBeInTheDocument();
        });
        expect(screen.getByText('Generate Video')).toBeInTheDocument();
        expect(screen.getByText('(reserved)')).toBeInTheDocument();
        expect(screen.getByText('Reserved')).toBeInTheDocument();
        expect(screen.queryByText('Released')).not.toBeInTheDocument();
    });

    it('shows reserved and released ledger after settlement', async () => {
        render(
            <UsageDetailsModal
                showUsageDetails
                setShowUsageDetails={() => undefined}
                streaming={false}
                msg={{
                    ...baseMsg,
                    cost_credits: 4800,
                    tool_usage_charges: [{
                        tool: 'generate_video',
                        display_name: 'Generate Video',
                        cost_credits: 4800,
                        status: 'settled',
                        reserved_credits: 600,
                        settled_credits: 4800,
                        reserved_at: 1_790_945_504_282,
                        released_at: 1_790_945_637_052,
                    }],
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Token usage' })).toBeInTheDocument();
        });
        expect(screen.getByText('Reserved')).toBeInTheDocument();
        expect(screen.getByText('Released')).toBeInTheDocument();
        expect(screen.queryByText('(reserved)')).not.toBeInTheDocument();
    });

    it('shows released label and zero credits after refund', async () => {
        render(
            <UsageDetailsModal
                showUsageDetails
                setShowUsageDetails={() => undefined}
                streaming={false}
                msg={{
                    ...baseMsg,
                    cost_credits: 33.892725,
                    tool_usage_charges: [{
                        tool: 'generate_video',
                        display_name: 'Generate Video',
                        cost_credits: 0,
                        status: 'refunded',
                        reserved_credits: 600,
                        settled_credits: 0,
                        reserved_at: 1_790_945_504_282,
                        released_at: 1_790_945_637_052,
                    }],
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByRole('dialog', { name: 'Token usage' })).toBeInTheDocument();
        });
        expect(screen.getByText('(released)')).toBeInTheDocument();
        expect(screen.getByText('Released')).toBeInTheDocument();
        expect(screen.getByText('Reserved')).toBeInTheDocument();
    });

    it('includes reserved tool credits in tools charged total section', async () => {
        render(
            <UsageDetailsModal
                showUsageDetails
                setShowUsageDetails={() => undefined}
                streaming={false}
                msg={{
                    role: 'assistant',
                    content: 'Video started',
                    timestamp: 1,
                    cost_credits: 633.892725,
                    usage: {
                        prompt_tokens: 100,
                        completion_tokens: 50,
                        total_tokens: 150,
                        tool_cost_credits: 600,
                    },
                    tool_usage_charges: [{
                        tool: 'generate_video',
                        display_name: 'Generate Video',
                        cost_credits: 600,
                        status: 'reserved',
                        reserved_credits: 600,
                        reserved_at: 1_790_945_504_282,
                    }],
                }}
            />,
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Tool charges')).toBeInTheDocument();
        });
    });
});
