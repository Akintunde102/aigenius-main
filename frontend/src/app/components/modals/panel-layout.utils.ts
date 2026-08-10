import type { DraggablePanelVariant, PanelPosition } from './useDraggablePanel';

export type PanelSize = { width: number; height: number };

export function readTitlebarOffset(): number {
    if (typeof window === 'undefined') return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--aigenius-desktop-titlebar-top');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function vw() {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
}

function vh() {
    return typeof window !== 'undefined' ? window.innerHeight : 800;
}

export function getViewportLimits() {
    const titlebarOffset = readTitlebarOffset();
    const availH = vh() - titlebarOffset;
    return {
        maxWidth: Math.max(320, vw() - 48),
        maxHeight: Math.max(240, availH - 48),
        titlebarOffset,
        availH,
    };
}

export function getDefaultPanelSize(variant: DraggablePanelVariant): PanelSize {
    const { maxWidth, maxHeight, availH } = getViewportLimits();

    if (variant === 'side') {
        return {
            width: Math.min(maxWidth, Math.max(360, Math.min(vw() * 0.5, 704))),
            height: Math.min(maxHeight, Math.round(availH * 0.75)),
        };
    }

    const width = Math.min(maxWidth, Math.max(720, Math.round(vw() * 0.85)));
    const height = Math.min(maxHeight, Math.max(520, Math.round(availH * 0.82)));
    return { width, height };
}

export function getCenteredModalPosition(size: PanelSize): PanelPosition {
    const { titlebarOffset, availH } = getViewportLimits();
    const x = Math.max(0, Math.round((vw() - size.width) / 2));
    const y = Math.max(
        titlebarOffset,
        Math.round(titlebarOffset + (availH - size.height) / 2),
    );
    return { x, y };
}

export function getCenteredModalLayout(): { size: PanelSize; position: PanelPosition } {
    const size = getDefaultPanelSize('modal');
    return { size, position: getCenteredModalPosition(size) };
}
