import { fireEvent, render, screen } from '@testing-library/react';
import { OrphanNoteLayer } from '../OrphanNoteLayer';
import type { StickyThreadMarker } from '@/app/components/model-interface/shared/types';

const marker: StickyThreadMarker = {
    markerId: 'marker-1',
    parentConversationId: 'conv-1',
    parentMessageId: 'msg-1',
    title: 'Side thread',
    draft: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    anchor: {
        surface: 'chat_transcript',
        anchorZone: 'chat_area',
        tapClientX: 10,
        tapClientY: 20,
        rowRelativeX: 10,
        rowRelativeY: 20,
        anchorText: 'Windows Disk Cleanup',
        messageExcerpt: 'Windows Disk Cleanup',
    },
};

describe('OrphanNoteLayer', () => {
    it('renders an inline icon on the highlight without a Side thread pill label', () => {
        const onOpenOrphanMarker = jest.fn();

        render(
            <div style={{ position: 'relative', width: 400, height: 200 }}>
                <OrphanNoteLayer
                    resolvedMarkerPositions={[
                        {
                            marker,
                            left: 10,
                            top: 20,
                            rects: [{ left: 10, top: 20, width: 120, height: 18 }],
                        },
                    ]}
                    selectionTrigger={null}
                    onOpenOrphanMarker={onOpenOrphanMarker}
                    triggerAnchoredReply={jest.fn()}
                />
            </div>,
        );

        expect(screen.queryByText('Side thread')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open side thread/i })).toBeInTheDocument();
    });

    it('opens the marker when the highlight is clicked', () => {
        const onOpenOrphanMarker = jest.fn();

        render(
            <div style={{ position: 'relative', width: 400, height: 200 }}>
                <OrphanNoteLayer
                    resolvedMarkerPositions={[
                        {
                            marker,
                            left: 10,
                            top: 20,
                            rects: [{ left: 10, top: 20, width: 120, height: 18 }],
                        },
                    ]}
                    selectionTrigger={null}
                    onOpenOrphanMarker={onOpenOrphanMarker}
                    triggerAnchoredReply={jest.fn()}
                />
            </div>,
        );

        fireEvent.click(screen.getByRole('button', { name: /open side thread/i }));
        expect(onOpenOrphanMarker).toHaveBeenCalledWith(marker);
    });
});
