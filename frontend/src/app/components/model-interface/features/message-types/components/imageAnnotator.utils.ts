import type { AttachmentPreviewTarget } from './AttachmentPreviewModal';
import { resolveAttachmentKind } from './messageAttachment.utils';
import { copyImageToClipboard } from './imageCopy.utils';

export type AnnotatorStroke = {
    points: { x: number; y: number }[];
    color: string;
    width: number;
};

export const ANNOTATOR_COLORS = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#ffffff',
    '#171717',
] as const;

export const ANNOTATOR_STROKE_WIDTHS = [
    { label: 'Fine', value: 2 },
    { label: 'Medium', value: 4 },
    { label: 'Thick', value: 8 },
] as const;

export const DEFAULT_STROKE_WIDTH = 4;

export function resolveImagePreviewTarget(
    attachment: AttachmentPreviewTarget | string,
): AttachmentPreviewTarget {
    if (typeof attachment === 'string') {
        const url = attachment;
        const name = url.split('/').pop()?.split('?')[0] || 'Image';
        const isLocalFileUrl = url.startsWith('local-file://');
        const localPath = isLocalFileUrl ? decodeURIComponent(url.replace('local-file://', '')) : undefined;
        return {
            fileUrl: url,
            fileName: decodeURIComponent(name),
            kind: 'image',
            localPath,
        };
    }
    const name =
        attachment.fileName ||
        attachment.fileUrl.split('/').pop()?.split('?')[0] ||
        'Image';
    const kind = attachment.kind || resolveAttachmentKind(name, attachment.fileUrl);
    const isLocalFileUrl = attachment.fileUrl.startsWith('local-file://');
    const localPath = attachment.localPath || (isLocalFileUrl ? decodeURIComponent(attachment.fileUrl.replace('local-file://', '')) : undefined);
    return {
        ...attachment,
        fileName: name,
        kind: kind === 'image' ? 'image' : kind,
        localPath,
    };
}

export function isImagePreviewTarget(
    attachment: AttachmentPreviewTarget | string | null | undefined,
): boolean {
    if (!attachment) return false;
    if (typeof attachment === 'string') {
        const name = attachment.split('/').pop()?.split('?')[0] || '';
        return resolveAttachmentKind(name, attachment) === 'image';
    }
    const kind = attachment.kind || resolveAttachmentKind(attachment.fileName || '', attachment.fileUrl);
    return kind === 'image';
}

export function clientPointToCanvas(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement,
): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

export function drawStrokesOnCanvas(
    ctx: CanvasRenderingContext2D,
    strokes: AnnotatorStroke[],
    upToIndex: number,
): void {
    const end = Math.min(upToIndex, strokes.length - 1);
    for (let i = 0; i <= end; i += 1) {
        const stroke = strokes[i];
        if (!stroke || stroke.points.length === 0) continue;
        ctx.fillStyle = stroke.color;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points.length === 1) {
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, Math.max(1, stroke.width / 2), 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let p = 1; p < stroke.points.length; p += 1) {
                ctx.lineTo(stroke.points[p].x, stroke.points[p].y);
            }
            ctx.stroke();
        }
    }
}

export async function copyCompositedImage(
    image: HTMLImageElement,
    canvas?: HTMLCanvasElement | null,
    localPath?: string,
): Promise<boolean> {
    return copyImageToClipboard({
        image,
        canvas,
        fileUrl: image.src,
        localPath,
    });
}

export async function compositeAnnotatedImageToBlob(
    image: HTMLImageElement,
    canvas?: HTMLCanvasElement | null,
): Promise<Blob | null> {
    const w = image.naturalWidth || canvas?.width || image.clientWidth;
    const h = image.naturalHeight || canvas?.height || image.clientHeight;
    if (w <= 0 || h <= 0) return null;

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    let drawn = false;
    try {
        ctx.drawImage(image, 0, 0, w, h);
        drawn = true;
    } catch {
        // Tainted or draw error
    }

    if (!drawn && image.src) {
        try {
            const res = await fetch(image.src, { mode: 'cors' });
            if (res.ok) {
                const b = await res.blob();
                if (typeof createImageBitmap === 'function') {
                    const bmp = await createImageBitmap(b);
                    ctx.drawImage(bmp, 0, 0, w, h);
                    drawn = true;
                }
            }
        } catch {
            // failed fetch fallback
        }
    }

    if (canvas && canvas.width > 0 && canvas.height > 0) {
        try {
            ctx.drawImage(canvas, 0, 0, w, h);
        } catch {
            // ignore
        }
    }

    return new Promise<Blob | null>((resolve) => {
        try {
            out.toBlob((b) => resolve(b), 'image/png');
        } catch {
            resolve(null);
        }
    });
}

