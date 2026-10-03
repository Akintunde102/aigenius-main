'use client';

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Copy,
    Check,
    Pencil,
    Undo2,
    Redo2,
    Download,
    Trash2,
    UploadCloud,
    Loader2,
} from 'lucide-react';
import type { AttachmentPreviewTarget } from './AttachmentPreviewModal';
import { triggerFileDownload } from './AttachmentPreviewModal';
import toast from 'react-hot-toast';
import {
    ANNOTATOR_COLORS,
    ANNOTATOR_STROKE_WIDTHS,
    DEFAULT_STROKE_WIDTH,
    type AnnotatorStroke,
    clientPointToCanvas,
    compositeAnnotatedImageToBlob,
    copyCompositedImage,
    drawStrokesOnCanvas,
    resolveImagePreviewTarget,
} from './imageAnnotator.utils';
import { copyTextToClipboard, resolveAbsoluteUrl } from './imageCopy.utils';
import { ImagePreviewContextMenu } from './ImagePreviewContextMenu';
import { uploadFile } from '@/lib/calls/upload-file';
import type { CloudFile } from '@/app/components/file/file.interface';

export interface ImageAnnotatorLightboxProps {
    attachment: AttachmentPreviewTarget | string;
    onClose: () => void;
    onSavedToUploads?: (savedFile: CloudFile) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

function ToolbarButton({
    onClick,
    title,
    disabled,
    active,
    children,
    className = '',
}: {
    onClick: () => void;
    title: string;
    disabled?: boolean;
    active?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className={`flex h-8 w-8 items-center justify-center rounded-xl transition text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:scale-95 disabled:opacity-25 disabled:pointer-events-none dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 ${
                active ? 'bg-blue-600 text-white shadow-md hover:bg-blue-500 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500' : ''
            } ${className}`}
        >
            {children}
        </button>
    );
}

export function ImageAnnotatorLightbox({ attachment, onClose, onSavedToUploads }: ImageAnnotatorLightboxProps) {
    const target = useMemo(() => resolveImagePreviewTarget(attachment), [attachment]);
    const [mounted, setMounted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [drawMode, setDrawMode] = useState(false);
    const [color, setColor] = useState<string>(ANNOTATOR_COLORS[0]); // Red by default for annotations
    const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
    const [strokes, setStrokes] = useState<AnnotatorStroke[]>([]);
    const [strokeIndex, setStrokeIndex] = useState(-1);
    const [activeStroke, setActiveStroke] = useState<AnnotatorStroke | null>(null);
    const [copied, setCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isSavingUpload, setIsSavingUpload] = useState(false);
    const [savedToUpload, setSavedToUpload] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const drawingRef = useRef(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
    const didLongPressRef = useRef(false);

    useEffect(() => {
        setMounted(true);
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setStrokes([]);
        setStrokeIndex(-1);
        setActiveStroke(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setImageLoaded(false);
        setContextMenu(null);
        setLinkCopied(false);
    }, [target.fileUrl]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawStrokesOnCanvas(ctx, strokes, strokeIndex);
        if (activeStroke) {
            drawStrokesOnCanvas(ctx, [activeStroke], 0);
        }
    }, [activeStroke, strokeIndex, strokes]);

    const syncCanvasSize = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas || !imageLoaded) return;
        const w = img.clientWidth;
        const h = img.clientHeight;
        if (w < 1 || h < 1) return;
        const dpr = window.devicePixelRatio || 1;
        const targetW = Math.round(w * dpr);
        const targetH = Math.round(h * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        }
        redrawCanvas();
    }, [imageLoaded, redrawCanvas]);

    useLayoutEffect(() => {
        syncCanvasSize();
    }, [syncCanvasSize]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    useEffect(() => {
        const onResize = () => syncCanvasSize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [syncCanvasSize]);

    const handleUndo = useCallback(() => {
        setStrokeIndex((idx) => Math.max(-1, idx - 1));
        setActiveStroke(null);
    }, []);

    const handleRedo = useCallback(() => {
        setStrokeIndex((idx) => Math.min(strokes.length - 1, idx + 1));
        setActiveStroke(null);
    }, [strokes.length]);

    const handleClear = useCallback(() => {
        if (strokes.length === 0 && strokeIndex === -1) return;
        setStrokes([]);
        setStrokeIndex(-1);
        setActiveStroke(null);
    }, [strokeIndex, strokes.length]);

    const handleCopy = useCallback(async () => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img) return;
        const ok = await copyCompositedImage(img, canvas, target.localPath);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [target.localPath]);

    const handleMenuCopy = useCallback(async () => {
        await handleCopy();
        setTimeout(() => setContextMenu(null), 300);
    }, [handleCopy]);

    const handleCopyLink = useCallback(async () => {
        if (!target.fileUrl) return;
        const link = resolveAbsoluteUrl(target.fileUrl);
        const ok = await copyTextToClipboard(link);
        if (ok) {
            setLinkCopied(true);
            toast.success('Image link copied to clipboard');
            setTimeout(() => {
                setLinkCopied(false);
                setContextMenu(null);
            }, 400);
        } else {
            toast.error('Failed to copy link');
        }
    }, [target.fileUrl]);

    const handleDownload = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img) {
            triggerFileDownload(target.fileUrl, target.fileName || 'image.png');
            return;
        }
        try {
            const w = img.naturalWidth || img.clientWidth;
            const h = img.naturalHeight || img.clientHeight;
            if (!w || !h) {
                triggerFileDownload(target.fileUrl, target.fileName || 'image.png');
                return;
            }
            const out = document.createElement('canvas');
            out.width = w;
            out.height = h;
            const ctx = out.getContext('2d');
            if (!ctx) {
                triggerFileDownload(target.fileUrl, target.fileName || 'image.png');
                return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(canvas, 0, 0, w, h);
            }
            out.toBlob((blob) => {
                if (!blob) {
                    triggerFileDownload(target.fileUrl, target.fileName || 'image.png');
                    return;
                }
                const url = URL.createObjectURL(blob);
                const baseName = (target.fileName || 'image').replace(/\.[^/.]+$/, '');
                triggerFileDownload(url, `${baseName}-annotated.png`);
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }, 'image/png');
        } catch {
            triggerFileDownload(target.fileUrl, target.fileName || 'image.png');
        }
    }, [target.fileName, target.fileUrl]);

    const handleSaveToUploads = useCallback(async () => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img) return;

        setIsSavingUpload(true);
        try {
            const blob = await compositeAnnotatedImageToBlob(img, canvas);
            if (!blob) {
                toast.error('Could not prepare image for upload');
                setIsSavingUpload(false);
                return;
            }

            const baseName = (target.fileName || 'image')
                .replace(/\.[^/.]+$/, '')
                .replace(/[^a-zA-Z0-9._-]/g, '_');
            const newFileName = `${baseName}-edited-${Date.now().toString().slice(-4)}.png`;
            const file = new File([blob], newFileName, { type: 'image/png' });

            const saved = await new Promise<CloudFile>((resolve, reject) => {
                uploadFile({
                    file,
                    onProgress: () => {},
                    onSuccess: (data) => resolve(data),
                    onError: (err) => reject(err),
                });
            });

            setSavedToUpload(true);
            toast.success(`Saved as "${newFileName}" in your uploads`);
            window.dispatchEvent(new CustomEvent('aigenius:file-uploaded', { detail: saved }));
            onSavedToUploads?.(saved);

            setTimeout(() => {
                setSavedToUpload(false);
                setContextMenu(null);
            }, 2500);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save image to uploads';
            toast.error(msg);
        } finally {
            setIsSavingUpload(false);
        }
    }, [target.fileName, onSavedToUploads]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (contextMenu) {
                    setContextMenu(null);
                    return;
                }
                onClose();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
                event.preventDefault();
                handleUndo();
            }
            if (
                ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
                ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && event.shiftKey)
            ) {
                event.preventDefault();
                handleRedo();
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
                event.preventDefault();
                void handleCopy();
            }
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
            }
            if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))));
            }
            if (event.key === '0') {
                event.preventDefault();
                setZoom(1);
                setPan({ x: 0, y: 0 });
            }
            if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey) {
                setDrawMode((v) => !v);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [handleCopy, handleRedo, handleUndo, onClose]);

    const commitStroke = useCallback(
        (stroke: AnnotatorStroke) => {
            if (stroke.points.length === 0) return;
            setStrokes((prev) => {
                const base = prev.slice(0, strokeIndex + 1);
                return [...base, stroke];
            });
            setStrokeIndex((prev) => prev + 1);
            setActiveStroke(null);
        },
        [strokeIndex],
    );

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        longPressStartRef.current = null;
    }, []);

    const startLongPressDetector = useCallback(
        (clientX: number, clientY: number) => {
            clearLongPressTimer();
            didLongPressRef.current = false;
            longPressStartRef.current = { x: clientX, y: clientY };
            longPressTimerRef.current = setTimeout(() => {
                didLongPressRef.current = true;
                if (drawingRef.current) {
                    drawingRef.current = false;
                    setActiveStroke(null);
                }
                if (panStartRef.current) {
                    panStartRef.current = null;
                    setIsPanning(false);
                }
                setContextMenu({ x: clientX, y: clientY });
            }, 450);
        },
        [clearLongPressTimer],
    );

    const onImageContextMenu = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            clearLongPressTimer();
            if (drawingRef.current) {
                drawingRef.current = false;
                setActiveStroke(null);
            }
            if (panStartRef.current) {
                panStartRef.current = null;
                setIsPanning(false);
            }
            setContextMenu({ x: e.clientX, y: e.clientY });
        },
        [clearLongPressTimer],
    );

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!imageLoaded) return;
            const canvas = canvasRef.current;
            const img = imgRef.current;
            if (!canvas || !img) return;

            if (e.button === 0) {
                startLongPressDetector(e.clientX, e.clientY);
            }

            if (drawMode && e.button === 0) {
                drawingRef.current = true;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                const pt = clientPointToCanvas(e.clientX, e.clientY, canvas);
                const dpr = img.clientWidth > 0 ? canvas.width / img.clientWidth : 1;
                setActiveStroke({
                    points: [pt],
                    color,
                    width: strokeWidth * dpr,
                });
                return;
            }

            if (!drawMode || e.button === 1 || e.button === 2) {
                setIsPanning(true);
                panStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    panX: pan.x,
                    panY: pan.y,
                };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }
        },
        [color, drawMode, imageLoaded, pan.x, pan.y, startLongPressDetector, strokeWidth],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (longPressStartRef.current) {
                const dist = Math.hypot(
                    e.clientX - longPressStartRef.current.x,
                    e.clientY - longPressStartRef.current.y,
                );
                if (dist > 8) {
                    clearLongPressTimer();
                }
            }

            const canvas = canvasRef.current;
            if (!canvas) return;

            if (drawingRef.current && drawMode) {
                const pt = clientPointToCanvas(e.clientX, e.clientY, canvas);
                setActiveStroke((prev) =>
                    prev ? { ...prev, points: [...prev.points, pt] } : prev,
                );
                return;
            }

            if (panStartRef.current) {
                const dx = e.clientX - panStartRef.current.x;
                const dy = e.clientY - panStartRef.current.y;
                setPan({
                    x: panStartRef.current.panX + dx,
                    y: panStartRef.current.panY + dy,
                });
            }
        },
        [clearLongPressTimer, drawMode],
    );

    const onPointerUp = useCallback(
        (e: React.PointerEvent) => {
            clearLongPressTimer();

            if (didLongPressRef.current) {
                didLongPressRef.current = false;
                drawingRef.current = false;
                setActiveStroke(null);
                panStartRef.current = null;
                setIsPanning(false);
                try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
                return;
            }

            if (drawingRef.current && drawMode && activeStroke) {
                drawingRef.current = false;
                commitStroke(activeStroke);
                try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
                return;
            }
            if (panStartRef.current) {
                panStartRef.current = null;
                setIsPanning(false);
                try {
                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
            }
        },
        [activeStroke, clearLongPressTimer, commitStroke, drawMode],
    );

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((z * factor).toFixed(2)))));
    }, []);

    const canUndo = strokeIndex >= 0;
    const canRedo = strokeIndex < strokes.length - 1;

    if (!mounted || typeof document === 'undefined') {
        return null;
    }

    const portalTarget = document.getElementById('modal-root') ?? document.body;

    return createPortal(
        (
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Image preview"
                className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200"
                onClick={(e) => {
                    // Close when clicking directly on backdrop
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                {/* Floating Minimalist Top Toolbar */}
                <header
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[10002] max-w-[calc(100vw-2rem)] flex items-center gap-1 sm:gap-1.5 px-3 py-2 rounded-2xl bg-white/95 text-zinc-900 border border-zinc-200/90 shadow-2xl backdrop-blur-xl dark:bg-zinc-900/95 dark:text-zinc-100 dark:border-zinc-700/60 transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Zoom controls */}
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton
                            title="Zoom out (-)"
                            disabled={zoom <= MIN_ZOOM}
                            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))))}
                        >
                            <ZoomOut size={16} />
                        </ToolbarButton>

                        <button
                            type="button"
                            title="Reset zoom to 100% (0)"
                            onClick={() => {
                                setZoom(1);
                                setPan({ x: 0, y: 0 });
                            }}
                            className="px-1.5 py-1 text-xs font-semibold tabular-nums text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition"
                        >
                            {Math.round(zoom * 100)}%
                        </button>

                        <ToolbarButton
                            title="Zoom in (+)"
                            disabled={zoom >= MAX_ZOOM}
                            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))))}
                        >
                            <ZoomIn size={16} />
                        </ToolbarButton>

                        <ToolbarButton
                            title="Reset view (0)"
                            onClick={() => {
                                setZoom(1);
                                setPan({ x: 0, y: 0 });
                            }}
                        >
                            <RotateCcw size={15} />
                        </ToolbarButton>
                    </div>

                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 shrink-0" />

                    {/* Draw Toggle & Stroke Width */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <ToolbarButton
                            title={drawMode ? 'Drawing mode ON (click to pan)' : 'Draw on image (D)'}
                            active={drawMode}
                            onClick={() => setDrawMode((v) => !v)}
                        >
                            <Pencil size={16} />
                        </ToolbarButton>

                        {/* Brush sizes */}
                        <div className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-0.5 border border-zinc-200/80 dark:bg-zinc-800/80 dark:border-zinc-700/40">
                            {ANNOTATOR_STROKE_WIDTHS.map((sw) => (
                                <button
                                    key={sw.value}
                                    type="button"
                                    title={`Brush: ${sw.label} (${sw.value}px)`}
                                    aria-label={`Brush size ${sw.label}`}
                                    onClick={() => {
                                        setStrokeWidth(sw.value);
                                        setDrawMode(true);
                                    }}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                                        strokeWidth === sw.value && drawMode
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/10'
                                    }`}
                                >
                                    <span
                                        className="rounded-full bg-current block"
                                        style={{
                                            width: `${Math.max(3, sw.value)}px`,
                                            height: `${Math.max(3, sw.value)}px`,
                                        }}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Color swatches */}
                        <div className="flex items-center gap-1 sm:gap-1.5 px-0.5">
                            {ANNOTATOR_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    title={`Color ${c}`}
                                    aria-label={`Draw color ${c}`}
                                    onClick={() => {
                                        setColor(c);
                                        setDrawMode(true);
                                    }}
                                    className={`h-5 w-5 shrink-0 rounded-full border transition-all hover:scale-110 active:scale-95 ${
                                        color === c && drawMode
                                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 scale-110 border-transparent dark:border-white'
                                            : 'border-black/20 dark:border-white/25 hover:border-black/50 dark:hover:border-white'
                                    }`}
                                    style={{
                                        backgroundColor: c,
                                        boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.25)' : undefined,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 shrink-0" />

                    {/* History & clear */}
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton title="Undo (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo}>
                            <Undo2 size={16} />
                        </ToolbarButton>
                        <ToolbarButton title="Redo (Ctrl+Y)" onClick={handleRedo} disabled={!canRedo}>
                            <Redo2 size={16} />
                        </ToolbarButton>
                        <ToolbarButton
                            title="Clear drawings"
                            onClick={handleClear}
                            disabled={strokes.length === 0 && strokeIndex === -1}
                        >
                            <Trash2 size={15} />
                        </ToolbarButton>
                    </div>

                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 shrink-0" />

                    {/* Copy, Download & Save to Uploads */}
                    <div className="flex items-center gap-0.5">
                        <ToolbarButton
                            title={copied ? 'Copied to clipboard!' : 'Copy image (Ctrl+C)'}
                            onClick={() => void handleCopy()}
                        >
                            {copied ? <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={16} />}
                        </ToolbarButton>
                        <ToolbarButton title="Download annotated image" onClick={handleDownload}>
                            <Download size={16} />
                        </ToolbarButton>
                        <ToolbarButton
                            title={
                                isSavingUpload
                                    ? 'Saving to uploads...'
                                    : savedToUpload
                                    ? 'Saved to uploads!'
                                    : 'Save as new image in uploads'
                            }
                            onClick={() => void handleSaveToUploads()}
                            disabled={isSavingUpload}
                            className={
                                savedToUpload
                                    ? 'text-emerald-600 bg-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-500/20'
                                    : strokeIndex >= 0
                                    ? 'text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300'
                                    : ''
                            }
                        >
                            {isSavingUpload ? (
                                <Loader2 size={16} className="animate-spin text-blue-600 dark:text-cyan-400" />
                            ) : savedToUpload ? (
                                <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <UploadCloud size={16} />
                            )}
                        </ToolbarButton>
                    </div>

                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700/60 mx-1 shrink-0" />

                    {/* Close */}
                    <ToolbarButton
                        title="Close (Esc)"
                        onClick={onClose}
                        className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                    >
                        <X size={17} />
                    </ToolbarButton>
                </header>

                {/* Main Viewport */}
                <div
                    ref={viewportRef}
                    data-backdrop="true"
                    className="relative flex flex-1 w-full h-full items-center justify-center overflow-hidden p-4 sm:p-8"
                    style={{
                        cursor: drawMode ? 'crosshair' : isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
                    }}
                    onClick={(e) => {
                        if (contextMenu) {
                            setContextMenu(null);
                        }
                        // Close if clicked on viewport backdrop
                        if (e.target === viewportRef.current) {
                            onClose();
                        }
                    }}
                    onWheel={handleWheel}
                    onPointerDown={!drawMode ? onPointerDown : undefined}
                    onPointerMove={!drawMode ? onPointerMove : undefined}
                    onPointerUp={!drawMode ? onPointerUp : undefined}
                    onPointerCancel={!drawMode ? onPointerUp : undefined}
                >
                    <div
                        className="relative max-h-full max-w-full transition-transform duration-75 ease-out"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'center center',
                        }}
                    >
                        <div
                            data-testid="image-annotator-target"
                            className="relative inline-block max-h-[calc(100vh-6rem)] max-w-[min(100vw-2rem,80rem)] shadow-2xl rounded-lg overflow-hidden"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onContextMenu={onImageContextMenu}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imgRef}
                                src={target.fileUrl}
                                alt={target.fileName || 'Preview'}
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                                className="block max-h-[calc(100vh-6rem)] max-w-[min(100vw-2rem,80rem)] select-none object-contain pointer-events-none"
                                draggable={false}
                                onLoad={() => {
                                    setImageLoaded(true);
                                    requestAnimationFrame(() => syncCanvasSize());
                                }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute left-0 top-0 h-full w-full touch-none"
                                style={{ pointerEvents: drawMode ? 'auto' : 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {contextMenu && (
                    <ImagePreviewContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        copied={copied}
                        linkCopied={linkCopied}
                        onClose={() => setContextMenu(null)}
                        onCopy={() => void handleMenuCopy()}
                        onCopyLink={!target.fileUrl.startsWith('data:') ? handleCopyLink : undefined}
                        onDownload={handleDownload}
                        onSaveToUploads={() => void handleSaveToUploads()}
                        isSavingUpload={isSavingUpload}
                        savedToUpload={savedToUpload}
                    />
                )}
            </div>
        ) as React.ReactNode,
        portalTarget,
    );
}
