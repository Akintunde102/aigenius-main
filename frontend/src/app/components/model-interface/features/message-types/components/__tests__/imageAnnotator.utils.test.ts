import {
    clientPointToCanvas,
    compositeAnnotatedImageToBlob,
    drawStrokesOnCanvas,
    isImagePreviewTarget,
    resolveImagePreviewTarget,
} from '../imageAnnotator.utils';

describe('imageAnnotator.utils', () => {
    it('resolves string URLs as image targets', () => {
        const target = resolveImagePreviewTarget('https://cdn.example.com/photo.png?v=1');
        expect(target.kind).toBe('image');
        expect(target.fileName).toBe('photo.png');
    });

    it('detects image preview targets', () => {
        expect(isImagePreviewTarget('https://x.test/a.jpg')).toBe(true);
        expect(isImagePreviewTarget({ fileUrl: 'https://x.test/a.pdf', fileName: 'a.pdf' })).toBe(false);
    });

    it('maps client coordinates onto canvas pixels', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        Object.defineProperty(canvas, 'getBoundingClientRect', {
            value: () => ({
                left: 10,
                top: 20,
                width: 100,
                height: 50,
                right: 110,
                bottom: 70,
                x: 10,
                y: 20,
                toJSON: () => ({}),
            }),
        });

        const pt = clientPointToCanvas(60, 45, canvas);
        expect(pt.x).toBe(100);
        expect(pt.y).toBe(50);
    });

    it('draws polyline strokes and single-point dots on canvas context', () => {
        const mockCtx = {
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            lineCap: '',
            lineJoin: '',
        } as unknown as CanvasRenderingContext2D;

        // Test multi-point stroke
        drawStrokesOnCanvas(mockCtx, [{
            points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
            color: '#ef4444',
            width: 4,
        }], 0);

        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10);
        expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 20);
        expect(mockCtx.stroke).toHaveBeenCalled();

        // Test single-point dot
        jest.clearAllMocks();
        drawStrokesOnCanvas(mockCtx, [{
            points: [{ x: 15, y: 15 }],
            color: '#3b82f6',
            width: 4,
        }], 0);

        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.arc).toHaveBeenCalledWith(15, 15, 2, 0, Math.PI * 2);
        expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('extracts localPath when local-file:// is provided', () => {
        const target = resolveImagePreviewTarget('local-file://C%3A%5CUsers%5Ctest%5Cpicture.png');
        expect(target.localPath).toBe('C:\\Users\\test\\picture.png');
    });

    it('preserves existing localPath in target object', () => {
        const target = resolveImagePreviewTarget({
            fileUrl: 'https://cdn.example.com/photo.png',
            localPath: '/home/user/photo.png',
        });
        expect(target.localPath).toBe('/home/user/photo.png');
    });

    it('compositeAnnotatedImageToBlob creates a blob from image and canvas', async () => {
        const mockImg = document.createElement('img');
        Object.defineProperty(mockImg, 'naturalWidth', { value: 200 });
        Object.defineProperty(mockImg, 'naturalHeight', { value: 100 });
        mockImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 200;
        mockCanvas.height = 100;

        const mockCtx = {
            drawImage: jest.fn(),
        };

        const originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
            const el = originalCreateElement(tagName as keyof HTMLElementTagNameMap);
            if (tagName === 'canvas') {
                (el as HTMLCanvasElement).getContext = jest.fn().mockReturnValue(mockCtx);
                (el as HTMLCanvasElement).toBlob = (callback: BlobCallback) => {
                    callback(new Blob(['test-png'], { type: 'image/png' }));
                };
            }
            return el;
        }) as any);

        const blob = await compositeAnnotatedImageToBlob(mockImg, mockCanvas);
        expect(blob).toBeInstanceOf(Blob);

        jest.restoreAllMocks();
    });
});

