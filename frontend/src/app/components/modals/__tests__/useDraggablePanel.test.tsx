import React, { useRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDraggablePanel } from '../useDraggablePanel';

function DraggableFixture({ enabled, resetKey }: { enabled: boolean; resetKey: string }) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const { panelStyle, isDragging, onDragHandlePointerDown } = useDraggablePanel(
        enabled,
        panelRef,
        resetKey,
    );

    return (
        <div data-testid="overlay" style={{ position: 'relative', width: 800, height: 600 }}>
            <div
                ref={panelRef}
                data-testid="panel"
                data-dragging={isDragging ? 'true' : 'false'}
                style={{ width: 200, height: 120, ...panelStyle }}
            >
                <header data-testid="handle" onPointerDown={onDragHandlePointerDown}>
                    Drag me
                    <button type="button">Action</button>
                </header>
            </div>
        </div>
    );
}

describe('useDraggablePanel', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

        if (typeof PointerEvent === 'undefined') {
            class PointerEventPolyfill extends MouseEvent {
                readonly pointerId: number;

                constructor(type: string, init: PointerEventInit = {}) {
                    super(type, init);
                    this.pointerId = init.pointerId ?? 0;
                }
            }
            global.PointerEvent = PointerEventPolyfill as typeof PointerEvent;
        }
    });

    it('centers the panel initially', () => {
        render(<DraggableFixture enabled resetKey="a" />);
        const panel = screen.getByTestId('panel');
        expect(panel).toHaveStyle({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
    });

    it('moves the panel when dragging the handle', async () => {
        render(<DraggableFixture enabled resetKey="a" />);
        const handle = screen.getByTestId('handle');
        const panel = screen.getByTestId('panel');

        Object.defineProperty(panel, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 200,
                height: 120,
                x: 300,
                y: 240,
                top: 240,
                left: 300,
                right: 500,
                bottom: 360,
            }),
        });

        act(() => {
            handle.dispatchEvent(
                new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 80, pointerId: 1 }),
            );
        });
        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointermove', { bubbles: true, clientX: 160, clientY: 120, pointerId: 1 }),
            );
        });

        expect(panel).toHaveStyle({ left: '360px', top: '280px' });
        expect(panel).not.toHaveStyle({ transform: 'translate(-50%, -50%)' });
    });

    it('does not start drag from toolbar buttons', () => {
        render(<DraggableFixture enabled resetKey="a" />);
        const button = screen.getByRole('button', { name: 'Action' });

        act(() => {
            fireEvent.pointerDown(button, { clientX: 100, clientY: 80, pointerId: 1, button: 0 });
            fireEvent.pointerMove(window, { clientX: 200, clientY: 160, pointerId: 1 });
        });

        const panel = screen.getByTestId('panel');
        expect(panel).toHaveStyle({ left: '50%', top: '50%' });
    });
});
