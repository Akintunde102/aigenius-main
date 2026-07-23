import { renderHook } from '@testing-library/react';
import { useResizablePanel } from '../useResizablePanel';

describe('useResizablePanel', () => {
    it('returns docked side resize edges on the west edge only', () => {
        const panelRef = { current: document.createElement('div') };
        const onPositionChange = jest.fn();

        const { result } = renderHook(() =>
            useResizablePanel(true, panelRef, 'side', null, onPositionChange),
        );

        expect(result.current.resizeEdges).toEqual(['w']);
        expect(result.current.panelSizeStyle.width).toBeGreaterThan(0);
    });

    it('returns all resize edges for floating modal panels', () => {
        const panelRef = { current: document.createElement('div') };
        const onPositionChange = jest.fn();

        const { result } = renderHook(() =>
            useResizablePanel(true, panelRef, 'modal', { x: 40, y: 40 }, onPositionChange),
        );

        expect(result.current.resizeEdges).toEqual(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']);
        expect(result.current.panelSizeStyle.width).toBeGreaterThan(0);
        expect(result.current.panelSizeStyle.height).toBeGreaterThan(0);
    });
});
