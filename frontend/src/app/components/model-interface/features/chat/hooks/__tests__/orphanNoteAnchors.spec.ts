import {
    isSelectionInsideOrphanIgnoredZone,
    findMarkersAtPoint,
    ORPHAN_IGNORE_SELECTOR,
} from '../orphanNoteAnchors';

describe('orphanNoteAnchors new helpers', () => {
    describe('isSelectionInsideOrphanIgnoredZone', () => {
        let container: HTMLDivElement;

        beforeEach(() => {
            container = document.createElement('div');
            document.body.appendChild(container);
        });

        afterEach(() => {
            document.body.removeChild(container);
        });

        it('returns false for normal prose text selection', () => {
            container.innerHTML = '<p id="prose">This is normal assistant response prose.</p>';
            const p = container.querySelector('#prose')!;
            const textNode = p.firstChild as Text;

            const range = document.createRange();
            range.setStart(textNode, 5);
            range.setEnd(textNode, 15);

            expect(isSelectionInsideOrphanIgnoredZone(container, range)).toBe(false);
        });

        it('returns true when selection is inside a data-orphan-ignore element (tool output)', () => {
            container.innerHTML = `
                <div>
                    <p>Some prose</p>
                    <div data-orphan-ignore id="tool-block">
                        <span>gmail_search results: 3 emails found</span>
                    </div>
                </div>
            `;
            const toolBlock = container.querySelector('#tool-block')!;
            const span = toolBlock.querySelector('span')!;
            const textNode = span.firstChild as Text;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 12);

            expect(isSelectionInsideOrphanIgnoredZone(container, range)).toBe(true);
        });

        it('returns true when selection is inside a <pre> code element', () => {
            container.innerHTML = `
                <div>
                    <pre id="code-block"><code>const x = 42;</code></pre>
                </div>
            `;
            const code = container.querySelector('code')!;
            const textNode = code.firstChild as Text;

            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 5);

            expect(isSelectionInsideOrphanIgnoredZone(container, range)).toBe(true);
        });
    });

    describe('findMarkersAtPoint', () => {
        const markerA = { markerId: 'm-a', title: 'Thread A' };
        const markerB = { markerId: 'm-b', title: 'Thread B' };

        const resolved = [
            {
                marker: markerA,
                rects: [
                    { left: 10, top: 20, width: 80, height: 16 },
                ],
            },
            {
                marker: markerB,
                rects: [
                    { left: 50, top: 20, width: 80, height: 16 }, // overlaps markerA from 50..90
                ],
            },
        ];

        it('finds single marker when clicking exclusive region', () => {
            const hits = findMarkersAtPoint(resolved, 25, 25);
            expect(hits).toEqual([markerA]);
        });

        it('finds both markers when clicking overlapping region', () => {
            const hits = findMarkersAtPoint(resolved, 60, 25);
            expect(hits).toEqual([markerA, markerB]);
        });

        it('returns empty array when clicking outside rects', () => {
            const hits = findMarkersAtPoint(resolved, 200, 25);
            expect(hits).toEqual([]);
        });
    });
});
