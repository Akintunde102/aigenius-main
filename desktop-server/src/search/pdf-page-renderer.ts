import fs from 'fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type RenderPdfPagesOptions = {
  maxPages?: number;
  scale?: number;
};

type CanvasAndContext = {
  canvas: { toBuffer: (format: string) => Uint8Array };
  context: CanvasRenderingContext2D;
};

type PdfCanvasFactory = {
  create: (width: number, height: number) => CanvasAndContext;
  destroy: (canvasAndContext: CanvasAndContext) => void;
};

/** Renders PDF pages to PNG buffers for OCR (Node canvas via pdf.js). */
export async function renderPdfPagesToPngBuffers(
  filePath: string,
  options: RenderPdfPagesOptions = {},
): Promise<Buffer[]> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;
  const canvasFactory = doc.canvasFactory as PdfCanvasFactory;

  const maxPages = Math.min(doc.numPages, options.maxPages ?? 25);
  const scale = options.scale ?? 2;
  const buffers: Buffer[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

    try {
      await page.render({
        canvas: canvasAndContext.canvas as unknown as HTMLCanvasElement,
        canvasContext: canvasAndContext.context,
        viewport,
      }).promise;
      buffers.push(Buffer.from(canvasAndContext.canvas.toBuffer('image/png')));
    } finally {
      page.cleanup();
      canvasFactory.destroy(canvasAndContext);
    }
  }

  return buffers;
}
